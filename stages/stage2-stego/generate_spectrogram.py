import os
import base64
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import soundfile as sf
import matplotlib.pyplot as plt
from scipy import signal

# ==============================================================================
# CONFIGURATION
# ==============================================================================
STAGE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(STAGE_DIR, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

FLAG = "SHADOWNET{7r4c3s_1n_th3_fr3qu3ncy_d0m41n}"
STEGHIDE_PASSPHRASE = "shelter"

# Audio filenames
AUTHENTIC_AUDIO = "intercept_alpha_09.wav"
DECOY_AUDIO_1 = "intercept_beta_02.wav"
DECOY_AUDIO_2 = "intercept_gamma_07.wav"

# Whistleblower intelligence paragraph (will be Base64 encoded)
INTEL_REPORT = f"""[TOP SECRET // SHADOWNET SURVEILLANCE INTERCEPT]
OPERATION: SHADOW_TRUTH
SOURCE: INTERNAL WHISTLEBLOWER
CLEARANCE LEVEL: TOP SECRET

Field intelligence indicates multiple audio transmissions were intercepted from the rogue broadcast node.

COMMUNICATION CHANNELS:
- {DECOY_AUDIO_1}: Decoy channel (scrambled noise / false telemetry).
- {DECOY_AUDIO_2}: Decoy channel (jamming broadcast / unauthenticated).
- {AUTHENTIC_AUDIO}: CONFIRMED authentic encrypted transmission.

INSTRUCTIONS:
Perform deep frequency domain analysis (Audio Spectrogram view) on '{AUTHENTIC_AUDIO}' in Audacity or Sonic Visualiser.
The covert access flag has been embedded directly in the acoustic frequency spectrum.
"""


def get_font(size=26):
    """Attempt to load standard system fonts, fallback to default if not found."""
    font_candidates = [
        "/usr/share/fonts/liberation-mono-fonts/LiberationMono-Bold.ttf",
        "/usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf",
        "/usr/share/fonts/google-droid-sans-fonts/DroidSans-Bold.ttf",
        "/usr/share/fonts/open-sans/OpenSans-Bold.ttf",
        "/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf",
    ]
    for candidate in font_candidates:
        if os.path.isfile(candidate):
            try:
                return ImageFont.truetype(candidate, size)
            except Exception:
                continue
    return ImageFont.load_default()


def synthesize_spectrogram_audio(
    text: str,
    duration: float = 6.0,
    sr: int = 44100,
    f_min: float = 1200,
    f_max: float = 7500,
    img_width: int = 800,
    img_height: int = 150,
    font_size: int = 26,
    noise_level: float = 0.005,
) -> np.ndarray:
    """
    Renders text onto a 2D image matrix and converts the visual pixels into
    corresponding audio frequencies (Additive Synthesis) so that the text
    appears clearly in Audacity's Spectrogram view.
    """
    # 1. Create grayscale canvas
    img = Image.new("L", (img_width, img_height), color=0)
    draw = ImageDraw.Draw(img)
    font = get_font(font_size)

    # Center text
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    pos_x = max(10, (img_width - text_w) // 2)
    pos_y = max(10, (img_height - text_h) // 2)
    draw.text((pos_x, pos_y), text, fill=255, font=font)

    # 2. Convert to numpy array & flip vertically (row 0 = low freq, row H = high freq)
    img_array = np.array(img)
    img_array = np.flipud(img_array)

    # 3. Additive synthesis across frequency bins
    num_samples = int(duration * sr)
    t = np.arange(num_samples) / sr
    audio = np.zeros(num_samples, dtype=np.float32)

    freqs = np.linspace(f_min, f_max, img_height)

    for r, freq in enumerate(freqs):
        row_pixels = img_array[r, :]
        if np.max(row_pixels) < 10:
            continue
        # Interpolate row pixel intensities across audio samples for smooth continuous envelope
        envelope = np.interp(
            np.linspace(0, img_width - 1, num_samples),
            np.arange(img_width),
            row_pixels
        ) / 255.0

        # Random phase to prevent high-amplitude cresting at t=0
        phase0 = np.random.uniform(0, 2 * np.pi)
        audio += np.sin(2 * np.pi * freq * t + phase0) * envelope

    # 4. Add subtle background ambience and carrier hum for realism
    audio += np.sin(2 * np.pi * 180 * t) * 0.03
    audio += np.sin(2 * np.pi * 60 * t) * 0.02
    if noise_level > 0:
        audio += np.random.normal(0, noise_level, num_samples)

    # 5. Normalize
    max_amp = np.max(np.abs(audio))
    if max_amp > 0:
        audio = (audio / max_amp) * 0.85

    return audio, sr


def generate_carrier_noise(duration: float = 5.0, sr: int = 44100) -> np.ndarray:
    """Generates realistic ambient radio static with carrier frequency sweeps."""
    num_samples = int(duration * sr)
    t = np.arange(num_samples) / sr
    noise = np.random.normal(0, 0.15, num_samples)
    # Bandpass filter noise
    sos = signal.butter(4, [800, 4000], btype="bandpass", fs=sr, output="sos")
    filtered = signal.sosfilt(sos, noise)
    # Add carrier pulse
    carrier = np.sin(2 * np.pi * 1500 * t + np.sin(2 * np.pi * 2 * t) * 200) * 0.1
    audio = filtered + carrier
    return (audio / np.max(np.abs(audio))) * 0.8, sr


def step1_create_whistleblower_image_and_embed():
    """Generates the whistleblower evidence image and embeds the Base64 intel report via steghide."""
    print("[+] Step 1: Generating Whistleblower intel report & image...")

    passphrase_file = os.path.join(ASSETS_DIR, "passphrase.txt")
    intel_b64 = base64.b64encode(INTEL_REPORT.strip().encode("utf-8")).decode("utf-8")
    with open(passphrase_file, "w") as f:
        f.write(intel_b64 + "\n")
    print(f"    - Base64 intel saved to '{passphrase_file}'")

    # Generate classified evidence image
    whistleblower_img_path = os.path.join(ASSETS_DIR, "whistleblower.jpg")
    img = Image.new("RGB", (650, 450), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)

    title_font = get_font(24)
    body_font = get_font(16)

    draw.rectangle([(20, 20), (630, 430)], outline=(180, 40, 40), width=3)
    draw.rectangle([(25, 25), (625, 75)], fill=(180, 40, 40))
    draw.text((40, 35), "SHADOWNET EVIDENCE EXHIBIT #2026-B", fill=(255, 255, 255), font=title_font)

    draw.text((40, 100), "STATUS: RECOVERED FROM DEEP RECON DRONE", fill=(50, 50, 50), font=body_font)
    draw.text((40, 130), "CLASSIFICATION: TOP SECRET // COMPROMISED", fill=(180, 40, 40), font=body_font)
    draw.text((40, 170), "METADATA PAYLOAD: [ENCRYPTED - EMBEDDED STEG ARCHIVE]", fill=(80, 80, 80), font=body_font)
    draw.text((40, 210), "PASSPHRASE HINT: Emergency bunker refuge", fill=(100, 100, 100), font=body_font)
    draw.text((40, 380), "AUTHENTICITY VERIFIED BY WHISTLEBLOWER CELL", fill=(120, 120, 120), font=body_font)

    img.save(whistleblower_img_path, "JPEG", quality=95)
    print(f"    - Created image '{whistleblower_img_path}'")

    # Embed using steghide
    cmd = [
        "steghide", "embed",
        "-cf", whistleblower_img_path,
        "-ef", passphrase_file,
        "-p", STEGHIDE_PASSPHRASE,
        "-f"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print(f"    - Successfully embedded intel report into '{whistleblower_img_path}' with passphrase '{STEGHIDE_PASSPHRASE}'")
    else:
        print(f"    [!] Steghide warning: {res.stderr}")


def step2_generate_audio_files():
    """Generates authentic and decoy audio files with high-definition spectrograms."""
    print("[+] Step 2: Generating Audio Transmissions...")

    # 1. Authentic Flag Audio (Tall, bold, high-contrast)
    authentic_path = os.path.join(ASSETS_DIR, AUTHENTIC_AUDIO)
    audio_flag, sr = synthesize_spectrogram_audio(
        text=FLAG,
        duration=6.5,
        sr=44100,
        f_min=1500,
        f_max=6500,
        img_width=950,
        img_height=100,
        font_size=36,
    )
    sf.write(authentic_path, audio_flag, sr)
    print(f"    - [AUTHENTIC] Flag transmission saved to '{authentic_path}'")

    # 2. Decoy Audio 1 (Decoy spectrogram text)
    decoy1_path = os.path.join(ASSETS_DIR, DECOY_AUDIO_1)
    audio_decoy1, sr = synthesize_spectrogram_audio(
        text="DECOY FEED // WRONG FREQUENCY CHANNEL",
        duration=5.0,
        sr=44100,
        f_min=1500,
        f_max=6000,
        img_width=850,
        img_height=100,
        font_size=28,
    )
    sf.write(decoy1_path, audio_decoy1, sr)
    print(f"    - [DECOY 1] Channel saved to '{decoy1_path}'")

    # 3. Decoy Audio 2 (Radio static and scrambled carrier)
    decoy2_path = os.path.join(ASSETS_DIR, DECOY_AUDIO_2)
    audio_decoy2, sr = generate_carrier_noise(duration=5.0, sr=44100)
    sf.write(decoy2_path, audio_decoy2, sr)
    print(f"    - [DECOY 2] Scrambled carrier saved to '{decoy2_path}'")


def step3_generate_reference_spectrogram():
    """Generates a reference image showing what the audio looks like in Audacity / Spectrogram."""
    print("[+] Step 3: Generating reference spectrogram plot...")
    authentic_path = os.path.join(ASSETS_DIR, AUTHENTIC_AUDIO)
    audio, sr = sf.read(authentic_path)

    f, t_spec, Sxx = signal.spectrogram(audio, sr, nperseg=1024, noverlap=896)

    plt.figure(figsize=(14, 6))
    plt.pcolormesh(t_spec, f, 10 * np.log10(Sxx + 1e-6), cmap="inferno", shading="auto")
    plt.ylim(0, 10000)
    plt.ylabel("Frequency [Hz]", fontsize=12)
    plt.xlabel("Time [sec]", fontsize=12)
    plt.title(f"Spectrogram Reference - {AUTHENTIC_AUDIO} (Audacity Spectrogram View)", fontsize=14)
    plt.colorbar(label="Intensity (dB)")
    plt.tight_layout()

    ref_path = os.path.join(ASSETS_DIR, "spectrogram_reference.png")
    plt.savefig(ref_path, dpi=150)
    plt.close()
    print(f"    - Saved visual reference to '{ref_path}'")


if __name__ == "__main__":
    print("=" * 60)
    print("SHADOWNET CTF - STAGE 2 STEGANOGRAPHY ASSET GENERATOR")
    print("=" * 60)
    step1_create_whistleblower_image_and_embed()
    step2_generate_audio_files()
    step3_generate_reference_spectrogram()
    print("\n✅ All assets generated successfully in 'assets/' directory.")