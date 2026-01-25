import cv2

def read_video(video_path):
    cap = cv2.VideoCapture(video_path)
    frames = []
    FRAME_SKIP = 3        # analyze every 3rd frame
    MAX_FRAMES = 900      # hard limit (30 sec @ 30fps)

    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count > MAX_FRAMES:
            break

        if frame_count % FRAME_SKIP != 0:
            continue

        # resize BEFORE detection
        frame = cv2.resize(frame, (640, 360))

        frames.append(frame)

    cap.release()  # ✅ FIXED: Moved outside the loop
    return frames  # ✅ FIXED: Moved outside the loop


def save_video(frames, ori_video_path, output_video_path):
    cap = cv2.VideoCapture(ori_video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    
    # ✅ Use resized dimensions (640x360) to match processed frames
    out = cv2.VideoWriter(output_video_path, fourcc, fps, (640, 360))

    # Writing frames onto output video
    for frame in frames:
        out.write(frame)
    
    cap.release()
    out.release()


def convert_meters_to_pixels(frames):
    pass