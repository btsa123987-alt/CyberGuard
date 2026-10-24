"""Decode QR images with bounded input sizes and validated image formats."""
from __future__ import annotations
from io import BytesIO

import cv2
import numpy as np
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 8_000_000
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}


class ImageValidationError(ValueError):
    pass


class QRNotFoundError(ImageValidationError):
    pass


def decode_qr(data: bytes) -> str:
    if not isinstance(data, bytes) or not data:
        raise ImageValidationError("An image file is required.")
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageValidationError("Image exceeds 5 MiB.")
    try:
        with Image.open(BytesIO(data)) as im:
            if im.format not in ALLOWED_FORMATS:
                raise ImageValidationError("Only PNG, JPEG, and WebP are accepted.")
            width, height = im.size
            if width <= 0 or height <= 0 or width * height > MAX_PIXELS:
                raise ImageValidationError("Image dimensions exceed the 8-megapixel limit.")
            if getattr(im, "n_frames", 1) > 1:
                raise ImageValidationError("Animated images are not accepted.")
            im.verify()
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError) as exc:
        if isinstance(exc, ImageValidationError):
            raise
        raise ImageValidationError("Uploaded file is not a valid image.") from exc

    image = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ImageValidationError("Unable to decode the uploaded image.")
    detector = cv2.QRCodeDetector()
    # Prefer multi-code detection to avoid silently selecting one of several URLs.
    try:
        found, decoded, *_ = detector.detectAndDecodeMulti(image)
        decoded = [s for s in decoded if s] if found else []
    except cv2.error:
        decoded = []
    if len(decoded) > 1:
        raise ImageValidationError("Multiple QR codes detected; upload an image with one code.")
    if len(decoded) == 1:
        return decoded[0]
    try:
        decoded_one, *_ = detector.detectAndDecode(image)
    except cv2.error as exc:
        raise ImageValidationError("QR decoding failed.") from exc
    if not decoded_one:
        raise QRNotFoundError("No readable QR code found in the image.")
    return decoded_one
