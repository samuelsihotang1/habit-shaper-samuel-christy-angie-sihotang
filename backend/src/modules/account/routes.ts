import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { IdParams, Ok, ok } from '@/lib/http.ts';
import { authOf } from '@/plugins/auth.ts';
import { MINUTE, type Bucket } from '@/plugins/rate-limit.ts';
import { ChangePasswordBody, MfaConfirmBody, MfaDisableBody, MfaSetupSchema } from '@/modules/auth/schemas.ts';
import { DeviceSchema, UserSchema } from '@/modules/users/schemas.ts';
import { serializeDevice, serializeUser } from '@/modules/users/serialize.ts';

const password: Bucket = { name: 'password', max: 10, windowMs: MINUTE, key: (request) => `password:${authOf(request).user.id}` };
const mfa: Bucket = { name: 'account-mfa', max: 10, windowMs: MINUTE, key: (request) => `account-mfa:${authOf(request).user.id}` };

/** `/api/account/…`: the signed-in user's password, two-factor and trusted browsers. */
const accountRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const account = app.services.account;
  app.addHook('onRequest', app.authenticate);

  app.put('/password', { config: { limits: [password] }, schema: { body: ChangePasswordBody, response: { 200: Ok(UserSchema) } } }, async (request) => {
    const { user, tokenId } = authOf(request);
    const updated = await account.changePassword(user, tokenId, request.body.current_password, request.body.password);
    return ok(serializeUser(updated), 'Password changed. Other sessions were signed out.');
  });

  app.post('/mfa/setup', { config: { limits: [mfa] }, schema: { response: { 200: Ok(MfaSetupSchema) } } }, async (request) => {
    const { user } = authOf(request);
    return ok(await account.startMfa(user));
  });

  app.post('/mfa/confirm', { config: { limits: [mfa] }, schema: { body: MfaConfirmBody, response: { 200: Ok(UserSchema) } } }, async (request) => {
    const { user } = authOf(request);
    return ok(serializeUser(await account.confirmMfa(user, request.body.code)), 'Two-factor authentication is on.');
  });

  // POST, not DELETE: the proof (password + code) travels in the body.
  app.post('/mfa/disable', { config: { limits: [mfa] }, schema: { body: MfaDisableBody, response: { 200: Ok(UserSchema) } } }, async (request) => {
    const { user } = authOf(request);
    const { password, code } = request.body;
    return ok(serializeUser(await account.disableMfa(user, password, code)), 'Two-factor authentication is off.');
  });

  app.get('/devices', { schema: { response: { 200: Ok(Type.Array(DeviceSchema)) } } }, async (request) => {
    const devices = await account.devices(authOf(request).user.id);
    return ok(devices.map(serializeDevice));
  });

  app.delete('/devices/all', { schema: { response: { 200: Ok(Type.Null()) } } }, async (request) => {
    await account.forgetAllDevices(authOf(request).user.id);
    return ok(null, 'Every trusted device was removed.');
  });

  app.delete('/devices/:id', { schema: { params: IdParams, response: { 200: Ok(Type.Null()) } } }, async (request) => {
    await account.forgetDevice(authOf(request).user.id, request.params.id);
    return ok(null, 'Device removed.');
  });
};

export default accountRoutes;
