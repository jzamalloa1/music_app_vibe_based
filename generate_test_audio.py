import numpy as np
import soundfile as sf
import os

def generate_beep(frequency, duration, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration))
    # Create a more complex tone with harmonics
    signal = np.sin(2 * np.pi * frequency * t)  # fundamental frequency
    signal += 0.5 * np.sin(4 * np.pi * frequency * t)  # first harmonic
    signal += 0.25 * np.sin(6 * np.pi * frequency * t)  # second harmonic
    
    # Add a slight fade in/out to avoid clicks
    fade_duration = 0.1  # seconds
    fade_length = int(fade_duration * sample_rate)
    fade_in = np.linspace(0, 1, fade_length)
    fade_out = np.linspace(1, 0, fade_length)
    
    signal[:fade_length] *= fade_in
    signal[-fade_length:] *= fade_out
    
    return signal

def create_test_audio(filename, frequency, duration):
    sample_rate = 44100
    signal = generate_beep(frequency, duration)
    # Normalize to [-1, 1] and make it louder
    signal = signal / np.max(np.abs(signal)) * 0.9  # 90% of maximum volume
    # Save as WAV file
    sf.write(filename, signal, sample_rate)

# Create the audio directory if it doesn't exist
os.makedirs('backend/static/audio', exist_ok=True)

# Generate different test tones for each track
frequencies = [440, 523, 659, 784, 880, 988]  # Different musical notes
for i, freq in enumerate(frequencies, 1):
    print(f"Generating sample{i}.wav at {freq}Hz")
    create_test_audio(f'backend/static/audio/sample{i}.wav', freq, 3.0)  # Make each tone 3 seconds long

print("Generated test audio files in backend/static/audio/") 