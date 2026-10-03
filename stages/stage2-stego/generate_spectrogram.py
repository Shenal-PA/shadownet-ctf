import numpy as np
import soundfile as sf
from scipy import signal
import matplotlib.pyplot as plt
import base64

FLAG = "SHADOWNET{7r4c3s_1n_th3_fr3qu3ncy_d0m41n}"
FLAG_B64 = base64.b64encode(FLAG.encode()).decode()

print (f"FLAG: {FLAG}")
print (f"FLAG_B64: {FLAG_B64}")

#audio parameters
sr = 4100
duration = 5
t = np.linspace(0, duration, int(sr*duration), endpoint=False)

#base tone
base_freq = 1000
audio = np.sin(2 * np.pi * base_freq * t) * 0.3

#add frequency sweeps
for i, char in enumerate(FLAG_B64):
    ascii_val = ord(char)
    freq = 2000 + (ascii_val * 10) 
    start_sample = int((i / len(FLAG_B64)) * sr * duration)
    end_sample = int(((i + 1) / len(FLAG_B64)) * sr * duration)
    
    char_duration = end_sample - start_sample
    char_t = np.linspace(0, char_duration / sr, char_duration, False)
    audio[start_sample:end_sample] += np.sin(2 * np.pi * freq * char_t) * 0.1

#add noise
audio += np.random.normal(0, 0.01, len(audio))

audio = audio / np.max(np.abs(audio))
sf.write('assets/message.wav', audio, sr)

#generate spectrogram
plt.figure(figsize=(12, 6))
f, t_spec, Sxx = signal.spectrogram(audio, sr)
plt.pcolormesh(t_spec, f, 10 * np.log10(Sxx + 1e-10), shading='gouraud')
plt.ylabel('Frequency [Hz]')
plt.xlabel('Time [sec]')
plt.title('Spectrogram - Look for Base64-encoded text')
plt.colorbar()
plt.savefig('assets/spectrogram_reference.png')
print("Spectrogram visualization saved to spectrogram_reference.png")

# Convert WAV to MP3
import subprocess
subprocess.run(['ffmpeg', '-i', 'assets/message.wav', 
                '-q:a', '9', 'assets/message.mp3', '-y'], 
               capture_output=True)
print("MP3 file created")