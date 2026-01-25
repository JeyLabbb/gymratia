#!/usr/bin/env python3
"""
Script to process GIF frames:
1. Extract frames from GIF
2. Remove white background
3. Apply GymRatIA colors (#FF2D2D)
4. Create new animated GIF
"""

import os
from PIL import Image, ImageSequence
import numpy as np

def remove_white_background(image, threshold=240):
    """Remove white background from image"""
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Convert to numpy array
    data = np.array(image)
    
    # Create mask for white pixels (RGB all > threshold)
    # White background: R, G, B all high values
    white_mask = (data[:, :, 0] > threshold) & (data[:, :, 1] > threshold) & (data[:, :, 2] > threshold)
    
    # Set alpha channel to 0 for white pixels
    data[:, :, 3] = np.where(white_mask, 0, data[:, :, 3])
    
    return Image.fromarray(data)

def apply_gymratia_colors(image):
    """Apply GymRatIA red color (#FF2D2D) to non-transparent pixels with high intensity"""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    data = np.array(image, dtype=np.float32)
    
    # GymRatIA red: #FF2D2D = RGB(255, 45, 45) - but we'll make it more vibrant
    # Use brighter, more saturated red
    red_rgb = np.array([255.0, 45.0, 45.0])
    
    # Create mask for non-transparent pixels
    alpha = data[:, :, 3]
    non_transparent = alpha > 0
    
    # Apply vibrant red color to non-transparent pixels
    for y in range(data.shape[0]):
        for x in range(data.shape[1]):
            if non_transparent[y, x]:
                # Get original RGB
                original_rgb = data[y, x, :3]
                
                # Calculate luminance/intensity (weighted average for perceived brightness)
                intensity = (0.299 * original_rgb[0] + 0.587 * original_rgb[1] + 0.114 * original_rgb[2]) / 255.0
                
                # Apply vibrant red with higher saturation and intensity
                # Make colors more intense and saturated
                if intensity < 0.3:
                    # Very dark areas: dark red but still visible
                    factor = 0.3 + intensity * 0.4
                    data[y, x, :3] = red_rgb * factor
                elif intensity < 0.6:
                    # Medium areas: strong red
                    factor = 0.7 + (intensity - 0.3) * 0.3
                    data[y, x, :3] = red_rgb * factor
                else:
                    # Light areas: bright, vibrant red
                    factor = 0.85 + (intensity - 0.6) * 0.15
                    data[y, x, :3] = red_rgb * factor
                
                # Increase saturation by making the red more pure
                # Reduce green and blue components to make it more red
                current_red = data[y, x, 0]
                data[y, x, 1] = min(45.0, data[y, x, 1] * 0.3)  # Reduce green
                data[y, x, 2] = min(45.0, data[y, x, 2] * 0.3)  # Reduce blue
                data[y, x, 0] = max(current_red, 200.0)  # Ensure strong red
                
                # Preserve alpha
                data[y, x, 3] = alpha[y, x]
    
    # Convert back to uint8
    data = np.clip(data, 0, 255).astype(np.uint8)
    return Image.fromarray(data)

def process_gif(input_path, output_path):
    """Process GIF: extract frames, remove background, apply colors, create new GIF"""
    print(f"Loading GIF: {input_path}")
    gif = Image.open(input_path)
    
    frames = []
    durations = []
    
    print("Processing frames...")
    frame_count = 0
    for i, frame in enumerate(ImageSequence.Iterator(gif)):
        # Skip every other frame to make animation faster (60 frames instead of 120)
        if i % 2 == 0:
            print(f"  Processing frame {frame_count + 1}...")
            
            # Convert to RGBA
            frame = frame.convert('RGBA')
            
            # Remove white background
            frame = remove_white_background(frame)
            
            # Apply GymRatIA colors
            frame = apply_gymratia_colors(frame)
            
            frames.append(frame)
            frame_count += 1
            
            # Get frame duration - make it VERY fast
            # 60 frames * 8ms = 0.48s per cycle, ~4 cycles in 2 seconds
            duration = 8  # 8ms per frame - very fast
            durations.append(duration)
    
    print(f"Saving processed GIF: {output_path}")
    
    # Resize frames to make GIF smaller (reduce to 60% of original size)
    resized_frames = []
    original_size = frames[0].size
    new_size = (int(original_size[0] * 0.6), int(original_size[1] * 0.6))
    
    print(f"Resizing frames from {original_size} to {new_size}...")
    for frame in frames:
        resized = frame.resize(new_size, Image.Resampling.LANCZOS)
        resized_frames.append(resized)
    
    # Ensure all durations are fast and consistent (no pauses)
    # Use the durations we calculated (8ms per frame)
    fast_durations = durations if len(durations) == len(resized_frames) else [8] * len(resized_frames)
    
    print(f"Using fixed {fast_durations[0]}ms duration per frame for smooth, fast animation")
    print(f"Total animation time: {sum(fast_durations) / 1000:.2f} seconds per cycle")
    print(f"Cycles per 2 seconds: {2000 / sum(fast_durations):.1f}")
    
    resized_frames[0].save(
        output_path,
        save_all=True,
        append_images=resized_frames[1:],
        duration=fast_durations,
        loop=0,
        format='GIF',
        transparency=0,
        disposal=2,  # Clear to background
        optimize=False  # Don't optimize to preserve speed
    )
    
    print(f"✅ Done! Processed {len(frames)} frames")
    print(f"Output saved to: {output_path}")

if __name__ == '__main__':
    input_gif = 'public/levantamiento-de-pesas.gif'
    output_gif = 'public/levantamiento-de-pesas-gymratia.gif'
    
    if not os.path.exists(input_gif):
        print(f"Error: {input_gif} not found")
        exit(1)
    
    process_gif(input_gif, output_gif)

