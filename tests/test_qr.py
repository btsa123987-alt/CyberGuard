import io
import unittest

import qrcode
from PIL import Image

from cyberguard.qr import ImageValidationError, QRNotFoundError, decode_qr


def qr_image(payload, fmt='PNG'):
    image = qrcode.make(payload)
    output = io.BytesIO()
    image.save(output, format=fmt)
    return output.getvalue()


class QRTests(unittest.TestCase):
    def test_real_qr(self):
        url = 'https://example.com/verify'
        self.assertEqual(decode_qr(qr_image(url)), url)

    def test_invalid_file(self):
        for data in (b'', b'hello', b'GIF89a' + b'x'*90):
            with self.subTest(data=data[:8]):
                with self.assertRaises(ImageValidationError):
                    decode_qr(data)

    def test_image_limit(self):
        with self.assertRaisesRegex(ImageValidationError, '5 MiB'):
            decode_qr(b'a' * (5 * 1024 * 1024 + 1))

    def test_oversized_dimensions(self):
        buf = io.BytesIO()
        Image.new('RGB', (3000, 3000)).save(buf, format='PNG')
        with self.assertRaisesRegex(ImageValidationError, '8-megapixel'):
            decode_qr(buf.getvalue())

    def test_no_qr(self):
        buf = io.BytesIO()
        Image.new('RGB', (200, 200), '#ffffff').save(buf, format='PNG')
        with self.assertRaises(QRNotFoundError):
            decode_qr(buf.getvalue())


if __name__ == '__main__':
    unittest.main()
