"""
File: stats.py
Author: William Bowley
Version: 0.1
Date: 2024 - 09 - 04

Description:
    Helper functions for statistical analysis
    of the data inputted by users
"""

import scipy.stats as stats


def calculate_percentile(user_mean, global_mean, global_stdev):
    """
    Calculates a user's percentile rank based on their mean reaction time
    compared to the global distribution.
    """

    # Existance check for gloval standard deviation
    if global_stdev == 0:
        return 50  # Return 50th percentile if no spread in data

    # Use the CDF to find the percentile
    return stats.norm.cdf(user_mean, loc=global_mean, scale=global_stdev) * 100
