"""CyberGuard URL/QR risk-analysis package."""


def create_app(config=None):
    """Flask application factory, imported lazily for standalone core tests."""
    from .server import create_app as factory
    return factory(config)
