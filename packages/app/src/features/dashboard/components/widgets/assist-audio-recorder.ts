export class AssistAudioRecorder {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private silentOutput: GainNode | null = null;

  async prepare(): Promise<number> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    this.context = new AudioContext();
    return this.context.sampleRate;
  }

  start(onChunk: (chunk: Int16Array) => void) {
    if (!this.stream || !this.context) {
      throw new Error('Microphone capture has not been prepared');
    }

    this.source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.silentOutput = this.context.createGain();
    this.silentOutput.gain.value = 0;
    this.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let index = 0; index < input.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, input[index] ?? 0));
        pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      onChunk(pcm);
    };
    this.source.connect(this.processor);
    this.processor.connect(this.silentOutput);
    this.silentOutput.connect(this.context.destination);
  }

  async dispose() {
    if (this.processor) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
    }
    this.source?.disconnect();
    this.silentOutput?.disconnect();
    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }
    await this.context?.close();
    this.stream = null;
    this.context = null;
    this.source = null;
    this.processor = null;
    this.silentOutput = null;
  }
}
