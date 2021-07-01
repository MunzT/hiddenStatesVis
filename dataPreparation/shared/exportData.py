#!/usr/bin/env python
# coding: utf-8

import json
import numpy as np
import os

exportDir = "data"

jsonData = {}

def setExportDir(add):
    global exportDir
    exportDir = os.path.join(exportDir, add)
    if not os.path.exists(exportDir):
        os.makedirs(exportDir)


def addForExport(data, c):
    global jsonData
    jsonData[c] = array_to_list(data)


def writeJson(dimRed, randomSeed):
    global jsonData
    directory = exportDir
    if not os.path.exists(exportDir):
        os.makedirs(directory)

    path = os.path.join(directory, "data_" + dimRed + "_RS" + str(randomSeed) + ".json")
    with open(path, "w") as f:
        f.write(json.dumps(jsonData))


#https://github.com/numpy/numpy/issues/8052
def array_to_list(array):
    if isinstance(array, np.ndarray):
        return array_to_list(array.tolist())
    elif isinstance(array, list):
        return [array_to_list(item) for item in array]
    elif isinstance(array, tuple):
        return tuple(array_to_list(item) for item in array)
    else:
        return array
