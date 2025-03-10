import numpy as np
from scipy.io import wavfile
import os

def create_coin_sound():
    # Coin collect sound - high-pitched ding
    duration = 0.3
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create a coin sound with two frequencies
    frequency1 = 1200
    frequency2 = 1800
    sound = 0.5 * np.sin(2 * np.pi * frequency1 * t) + 0.3 * np.sin(2 * np.pi * frequency2 * t)
    
    # Add fade out
    fade = np.linspace(1, 0, len(sound))
    sound = sound * fade
    
    return sound, sample_rate

def create_pop_sound():
    # Pop sound - short burst
    duration = 0.15
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    frequency = 800
    sound = np.sin(2 * np.pi * frequency * t)
    
    # Add quick fade in and out
    fade_in = np.linspace(0, 1, int(len(sound) // 4))
    fade_out = np.linspace(1, 0, len(sound) - len(fade_in))
    fade = np.concatenate((fade_in, fade_out))
    sound = sound * fade
    
    return sound, sample_rate

def create_win_sound():
    # Win sound - ascending notes
    duration = 0.5
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    frequencies = [440, 554, 659, 880]
    sound = np.zeros_like(t)
    
    for i, freq in enumerate(frequencies):
        start = int(i * len(t) / len(frequencies))
        end = int((i + 1) * len(t) / len(frequencies))
        sound[start:end] = np.sin(2 * np.pi * freq * t[start:end])
    
    return sound, sample_rate

def create_level_up_sound():
    # Level up sound - ascending chord
    duration = 0.6
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    base_freq = 440
    frequencies = [base_freq, base_freq * 1.25, base_freq * 1.5]
    sound = np.zeros_like(t)
    
    for freq in frequencies:
        sound += 0.3 * np.sin(2 * np.pi * freq * t)
    
    # Add fade in
    fade_in = np.linspace(0, 1, len(sound))
    sound = sound * fade_in
    
    return sound, sample_rate

def create_cheer_sound():
    # Cheer sound - multiple frequencies with noise
    duration = 0.8
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Create a mix of frequencies for a "crowd" effect
    frequencies = [440, 880, 1320]
    sound = np.zeros_like(t)
    
    for freq in frequencies:
        sound += 0.2 * np.sin(2 * np.pi * freq * t)
    
    # Add some noise for texture
    noise = np.random.normal(0, 0.1, len(sound))
    sound = sound + noise
    
    # Normalize
    sound = sound / np.max(np.abs(sound))
    
    return sound, sample_rate

def main():
    # Create sounds directory if it doesn't exist
    os.makedirs('assets/sounds', exist_ok=True)
    
    # Generate and save all sounds
    sounds = {
        'coin-collect': create_coin_sound,
        'pop': create_pop_sound,
        'win': create_win_sound,
        'level-up': create_level_up_sound,
        'cheer': create_cheer_sound
    }
    
    for name, create_func in sounds.items():
        # Generate sound
        sound, sample_rate = create_func()
        
        # Save as WAV
        wav_path = f'assets/sounds/{name}.wav'
        
        # Normalize and convert to 16-bit integer
        sound = np.int16(sound * 32767)
        wavfile.write(wav_path, sample_rate, sound)
        
        print(f'Created {name}.wav')

if __name__ == '__main__':
    main()