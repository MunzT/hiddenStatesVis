#!/usr/bin/env python
# coding: utf-8

def setSeeds(seed=42):
    import os
    os.environ['PYTHONHASHSEED'] = str(seed)
    os.environ['CUDA_VISIBLE_DEVICES']='-1'
    os.environ['TF_CUDNN_USE_AUTOTUNE'] ='0'

    import numpy as np
    np.random.seed(seed)

    import random
    random.seed(seed)

    import tensorflow as tf
    tf.random.set_random_seed(seed)
