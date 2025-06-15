class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 1024;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length > 0) {
      const inputChannel = input[0];
      
      // Copy input to output (passthrough)
      if (output.length > 0) {
        output[0].set(inputChannel);
      }

      // Buffer the audio data
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;

        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32Array to PCM16
          const pcm16Buffer = new Int16Array(this.bufferSize);
          for (let j = 0; j < this.bufferSize; j++) {
            pcm16Buffer[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
          }

          // Send to main thread
          this.port.postMessage({
            type: 'audioData',
            data: pcm16Buffer
          });

          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }

    return true; // Keep processor alive
  }
}

registerProcessor('audio-processor', AudioProcessor); 