declare module "@ffprobe-installer/ffprobe" {
  interface FFProbeInstaller {
    path: string
  }

  const ffprobeInstaller: FFProbeInstaller
  export default ffprobeInstaller
}

declare module "@ffmpeg-installer/ffmpeg" {
  interface FFMpegInstaller {
    path: string
  }

  const ffmpegInstaller: FFMpegInstaller
  export default ffmpegInstaller
}
