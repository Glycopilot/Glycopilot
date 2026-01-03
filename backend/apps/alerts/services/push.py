class PushSendError(Exception):
    pass


def send_push(*, user, title: str, body: str, data: dict | None = None) -> None:
    """
    Stub : branche FCM ici.
    - Lève PushSendError en cas d’échec.
    """
    # TODO: implémenter FCM (device token, etc.)
    return
