from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from datetime import datetime, timedelta
from app.config import settings

security = HTTPBearer()


def create_jwt_token(user_id: str) -> str:
    expires_delta = timedelta(days=1)
    expire = datetime.utcnow() + expires_delta

    to_encode = {"userId": user_id, "exp": expire}

    return jwt.encode(
        to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def verify_jwt_token(token: str) -> str:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("userId")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(
    token: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    if token is None:
        raise HTTPException(status_code=403, detail="Not authenticated")

    user_id = verify_jwt_token(token.credentials)
    return user_id
