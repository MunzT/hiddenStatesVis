#!/usr/bin/python
# -*- coding: <UTF-8> -*-

"""
Main functions for visual analytics approach.
"""

import json
import numpy as np
import os
import toml
from flask import Flask, render_template, request
from sklearn.metrics import confusion_matrix

app = Flask(__name__)


@app.route("/")
def main():
    global userData
    cwd = os.getcwd()
    print(cwd)

    userData = toml.load(r"userData.toml")

    return render_template("visualizations.html",
                           datasets=userData.keys())


@app.route("/dimRed", methods=["POST"])
def dimRed():
    global data, userData

    parameters = request.get_json()
    dataset = parameters["dataset"]

    # read json file
    with open(userData[dataset]) as f:
        data = json.load(f)

    distances_2D, distances_orig = getDistancesToNextSample(data["projection"], data["hiddenStates"])
    confusionMatrix = array_to_list(confusion_matrix(data["actualValues"], data["predictions"], labels=range(len(data["classes"]))))

    return {"projection": data["projection"],
            "actualValues": data["actualValues"],
            "predictions": data["predictions"],
            "hiddenStates": data["hiddenStates"],
            "modelOutputs": data["modelOutputs"],
            "texts": data["texts"],
            "classes": data["classes"],
            "distances": array_to_list(distances_orig / getMax(distances_orig)),
            "confusionMatrix": confusionMatrix,
            "accuracy": data["model_accuracy"]}


def getDistancesToNextSample(data2D, dataOrig):
    allDists2D = []
    allDistsOrig = []
    for i in range(len(data2D)):
        dists2D = []
        distsOrig = []
        for j in range(len(data2D[i]) - 1):

            dist2D = distance(np.asarray(data2D[i][j]), np.asarray(data2D[i][j + 1]))
            distOrig = distance(np.asarray(dataOrig[i][j]), np.asarray(dataOrig[i][j + 1]))

            dists2D.append(dist2D)
            distsOrig.append(distOrig)

        allDists2D.append(np.asarray(dists2D))
        allDistsOrig.append(np.asarray(distsOrig))

    return np.asarray(allDists2D), np.asarray(allDistsOrig)


def distance(a, b):
    return np.linalg.norm(a - b)


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


def getMax(data): #data can have different sub shapes
    return max(sub.max() if len(sub) > 0 else 0 for sub in data)
