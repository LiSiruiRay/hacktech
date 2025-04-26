# Author: ray
# Date: 2/25/25
# Description: Script to run all tests for the event predictor

import unittest
import os
import sys

def run_tests():
    """Run all tests in the test directory."""
    # Get the current directory
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Add the parent directory to the path
    parent_dir = os.path.dirname(current_dir)
    sys.path.append(parent_dir)
    
    # Discover and run tests
    test_loader = unittest.TestLoader()
    test_suite = test_loader.discover(current_dir, pattern="test_*.py")
    
    test_runner = unittest.TextTestRunner(verbosity=2)
    test_runner.run(test_suite)

if __name__ == "__main__":
    run_tests()