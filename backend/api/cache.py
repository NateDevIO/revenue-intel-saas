"""
API Response Caching
===================

Provides caching utilities for API responses to improve performance.
"""

from functools import wraps
from typing import Any, Callable, Optional
import hashlib
import json
import time
from collections import OrderedDict


class SimpleCache:
    """
    Simple in-memory LRU cache with TTL support.

    For production, consider using Redis or memcached.
    """

    def __init__(self, max_size: int = 100, default_ttl: int = 300):
        self.cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
        self.max_size = max_size
        self.default_ttl = default_ttl

    def _make_key(self, *args, **kwargs) -> str:
        """Generate cache key from arguments."""
        key_dict = {"args": args, "kwargs": kwargs}
        key_str = json.dumps(key_dict, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if key not in self.cache:
            return None

        value, expiry = self.cache[key]
        if time.time() > expiry:
            # Expired, remove it
            del self.cache[key]
            return None

        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set value in cache with TTL."""
        if ttl is None:
            ttl = self.default_ttl

        expiry = time.time() + ttl

        # Remove oldest item if at max size
        if len(self.cache) >= self.max_size and key not in self.cache:
            self.cache.popitem(last=False)

        self.cache[key] = (value, expiry)
        self.cache.move_to_end(key)

    def clear(self):
        """Clear all cached values."""
        self.cache.clear()

    def invalidate_pattern(self, pattern: str):
        """Invalidate all keys matching a pattern."""
        keys_to_delete = [k for k in self.cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self.cache[key]


# Global cache instance
_cache = SimpleCache(max_size=200, default_ttl=300)  # 5 minutes default TTL


def cached(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results.

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key

    Example:
        @cached(ttl=60, key_prefix="customers")
        async def get_customers():
            # expensive operation
            return data
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:"
            cache_key += _cache._make_key(*args, **kwargs)

            # Try to get from cache
            cached_value = _cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Call function and cache result
            result = await func(*args, **kwargs)
            _cache.set(cache_key, result, ttl)
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:"
            cache_key += _cache._make_key(*args, **kwargs)

            # Try to get from cache
            cached_value = _cache.get(cache_key)
            if cached_value is not None:
                return cached_value

            # Call function and cache result
            result = func(*args, **kwargs)
            _cache.set(cache_key, result, ttl)
            return result

        # Return appropriate wrapper based on whether function is async
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def clear_cache():
    """Clear all cached values."""
    _cache.clear()


def invalidate_cache(pattern: str):
    """Invalidate cache entries matching a pattern."""
    _cache.invalidate_pattern(pattern)


# Cache configuration for different endpoints
CACHE_CONFIG = {
    "summary": {"ttl": 60, "key_prefix": "summary"},  # 1 minute
    "customers": {"ttl": 120, "key_prefix": "customers"},  # 2 minutes
    "health": {"ttl": 300, "key_prefix": "health"},  # 5 minutes
    "funnel": {"ttl": 300, "key_prefix": "funnel"},  # 5 minutes
    "revenue": {"ttl": 180, "key_prefix": "revenue"},  # 3 minutes
    "churn": {"ttl": 180, "key_prefix": "churn"},  # 3 minutes
    "actions": {"ttl": 300, "key_prefix": "actions"},  # 5 minutes
}


def get_cache_config(endpoint: str) -> dict:
    """Get cache configuration for an endpoint."""
    return CACHE_CONFIG.get(endpoint, {"ttl": 300, "key_prefix": "default"})
