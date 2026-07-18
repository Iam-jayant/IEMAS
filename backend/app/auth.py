"""
Authentication and Authorization Module
Supabase Auth integration with JWT token verification

DEVELOPMENT MODE: Authentication is DISABLED for development
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import os

# DEVELOPMENT MODE FLAG
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"

# HTTP Bearer token security (optional in dev mode)
security = HTTPBearer(auto_error=False)


class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user
    
    **DEVELOPMENT MODE**: Returns mock user without authentication
    
    Args:
        credentials: HTTP Bearer credentials with JWT token (ignored in dev mode)
        
    Returns:
        User data dictionary
    """
    # DEVELOPMENT MODE: Skip authentication
    if DEV_MODE:
        return {
            "id": "dev-user-123",
            "email": "dev@iemas.local",
            "role": "admin",
            "user_metadata": {},
            "app_metadata": {}
        }
    
    # Production authentication code (disabled for now)
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # TODO: Implement Supabase auth verification in production
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication not configured",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[Dict[str, Any]]:
    """
    Optional dependency to get current user if token is provided
    
    **DEVELOPMENT MODE**: Always returns mock user
    
    Args:
        credentials: HTTP Bearer credentials (ignored in dev mode)
        
    Returns:
        User data dictionary if authenticated, None otherwise
    """
    if DEV_MODE:
        return {
            "id": "dev-user-123",
            "email": "dev@iemas.local",
            "role": "admin"
        }
    
    return None


def require_role(required_role: str):
    """
    Dependency factory to require specific user role
    
    **DEVELOPMENT MODE**: Always grants access
    
    Args:
        required_role: Required role (e.g., "admin", "authenticated")
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if DEV_MODE:
            return user
        
        user_role = user.get("role", "authenticated")
        
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        
        return user
    
    return role_checker

