module.exports = {
  CameraView: 'CameraView',
  Camera: 'Camera',
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
  CameraType: { front: 'front', back: 'back' },
  FlashMode: { off: 'off', on: 'on', auto: 'auto' },
};
