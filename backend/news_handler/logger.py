import logging
import inspect
import os
from typing import Any, Optional

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

def get_logger(name: str = None) -> logging.Logger:
    """Get a logger with the given name."""
    if name is None:
        # Get the calling module's name
        frame = inspect.stack()[1]
        module = inspect.getmodule(frame[0])
        name = module.__name__ if module else 'unknown'
    
    return logging.getLogger(name)

def log(level: int, msg: str, *args, **kwargs) -> None:
    """
    Log a message with the given level, automatically including file and line information.
    """
    # Get caller's frame information
    frame = inspect.currentframe().f_back
    filename = os.path.basename(frame.f_code.co_filename)
    lineno = frame.f_lineno
    
    # Get the calling module's name
    module = inspect.getmodule(frame)
    logger_name = module.__name__ if module else 'unknown'
    
    # Get the logger
    logger = logging.getLogger(logger_name)
    
    # Format the message with caller information
    formatted_msg = f"[{filename}:{lineno}] {msg}"
    
    # Log the message
    logger.log(level, formatted_msg, *args, **kwargs)

def debug(msg: str, *args, **kwargs) -> None:
    """Log a DEBUG level message."""
    log(logging.DEBUG, msg, *args, **kwargs)

def info(msg: str, *args, **kwargs) -> None:
    """Log an INFO level message."""
    log(logging.INFO, msg, *args, **kwargs)

def warning(msg: str, *args, **kwargs) -> None:
    """Log a WARNING level message."""
    log(logging.WARNING, msg, *args, **kwargs)

def error(msg: str, *args, **kwargs) -> None:
    """Log an ERROR level message."""
    log(logging.ERROR, msg, *args, **kwargs)

def critical(msg: str, *args, **kwargs) -> None:
    """Log a CRITICAL level message."""
    log(logging.CRITICAL, msg, *args, **kwargs)

def log_data(name: str, data: Any, level: int = logging.INFO) -> None:
    """
    Log data with its type and representation.
    """
    data_type = type(data).__name__
    data_repr = repr(data)
    
    # Truncate very long representations
    if len(data_repr) > 1000:
        data_repr = data_repr[:997] + "..."
    
    log(level, f"DATA[{name}] (type: {data_type}): {data_repr}")

def set_level(level: int) -> None:
    """Set the logging level for all loggers."""
    logging.getLogger().setLevel(level)