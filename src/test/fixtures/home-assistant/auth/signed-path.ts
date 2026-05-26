export const signedPathFixture = {
  path: '/api/image/serve/image-id/512x512?authSig=signed-image-token',
  expiresSeconds: 30,
  sourceWebSocketCommand: {
    type: 'auth/sign_path',
    path: '/api/image/serve/image-id/512x512',
    expires: 30,
  },
};
