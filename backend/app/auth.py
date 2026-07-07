"""
Authentication and Authorization Module
Supabase Auth integration with JWT token verification
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import os
from supabase import create_client, Client
import jwt
from datetime import datetime, timedelta

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

# HTTP Bearer token security
security = HTTPBearer()


class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass


async def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verify Supabase JWT token and return user data
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        User data dictionary with id, email, and metadata
        
    Raises:
        AuthenticationError: If token is invalid or expired
    """
    try:
        # Get user from Supabase Auth using the token
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise AuthenticationError("Invalid authentication token")
        
        user = user_response.user
        
        return {
            "id": user.id,
            "email": user.email,
            "role": user.role if hasattr(user, 'role') else "authenticated",
            "user_metadata": user.user_metadata if hasattr(user, 'user_metadata') else {},
            "app_metadata": user.app_metadata if hasattr(user, 'app_metadata') else {}
        }
        
    except Exception as e:
        raise AuthenticationError(f"Token verification failed: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dependency to get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer credentials with JWT token
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: 401 Unauthorized if authentication fails
    """
    try:
        token = credentials.credentials
        user = await verify_supabase_token(token)
        return user
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[Dict[str, Any]]:
    """
    Optional dependency to get current user if token is provided
    Used for endpoints that can work with or without authentication
    
    Args:
        credentials: HTTP Bearer credentials with JWT token (optional)
        
    Returns:
        User data dictionary if authenticated, None otherwise
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        user = await verify_supabase_token(token)
        return user
    except Exception:
        return None


def require_role(required_role: str):
    """
    Dependency factory to require specific user role
    
    Args:
        required_role: Required role (e.g., "admin", "authenticated")
        
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "authenticated")
        
        if user_role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role}"
            )
        
        return user
    
    return role_checker


# Utility functions for authentication
async def create_session(email: str, password: str) -> Dict[str, Any]:
    """
    Create authentication session with Supabase
    
    Args:
        email: User email
        password: User password
        
    Returns:
        Session data with access_token and user info
        
    Raises:
        AuthenticationError: If login fails
    """
    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if not response or not response.session:
            raise AuthenticationError("Invalid credentials")
        
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
            "user": {
                "id": response.user.id,
                "email": response.user.email
            }
        }
    except Exception as e:
        raise AuthenticationError(f"Login failed: {str(e)}")


async def refresh_session(refresh_token: str) -> Dict[str, Any]:
    """
    Refresh authentication session
    
    Args:
        refresh_token: Refresh token from previous session
        
    Returns:
        New session data with fresh access_token
        
    Raises:
        AuthenticationError: If refresh fails
    """
    try:
        response = supabase.auth.refresh_session(refresh_token)
        
        if not response or not response.session:
            raise AuthenticationError("Failed to refresh session")
        
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at
        }
    except Exception as e:
        raise AuthenticationError(f"Session refresh failed: {str(e)}")


async def sign_out(access_token: str) -> bool:
    """
    Sign out user session
    
    Args:
        access_token: Current access token
        
    Returns:
        True if sign out successful
    """
    try:
        supabase.auth.sign_out()
        return True
    except Exception:
        return False
