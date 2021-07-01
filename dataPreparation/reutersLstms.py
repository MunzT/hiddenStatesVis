#!/usr/bin/env python
# coding: utf-8

# LSTM Hidden State Analysis: reuters

import sys

import shared.randomValues as randomValues

randomSeed = 101
if len(sys.argv) > 1:
    randomSeed = int(sys.argv[1])

print("Random seed: ", randomSeed)
randomValues.setSeeds(randomSeed)

import numpy as np
from keras.datasets import reuters
from keras.preprocessing import sequence as sq
from keras.utils import to_categorical

import shared.shared as s
import shared.exportData as exp

exp.setExportDir("reuters_" + str(randomSeed))

labels_colors = ['red', 'green', 'blue', 'gray', 'yellow']


def prepareData(sequenceLength):
    # We train a LSTM model with the Reuters dataset. The purpose is to predict if a review is positive or negative.
    (x_train_og, y_train_og), (x_test_og, y_test_og) = reuters.load_data()

    # Truncate and pad input sequences (fill with zeros if fewer words then max length).
    x_train_og = sq.pad_sequences(x_train_og, maxlen=sequenceLength)
    x_test_og = sq.pad_sequences(x_test_og, maxlen=sequenceLength)

    # We use only 5 classes
    chosen_classes = np.argsort(np.histogram(y_train_og, bins=45)[0])[-5:]

    id_to_word, word_to_id = s.wordToId(reuters, randomSeed)

    x_train = x_train_og[np.isin(y_train_og, chosen_classes), :]
    x_test = x_test_og[np.isin(y_test_og, chosen_classes), :]
    y_train = y_train_og[np.isin(y_train_og, chosen_classes)]
    y_test = y_test_og[np.isin(y_test_og, chosen_classes)]

    for i in range(y_train.shape[0]):
        j, = np.where(chosen_classes == y_train[i])
        y_train[i] = j

    for i in range(y_test.shape[0]):
        j, = np.where(chosen_classes == y_test[i])
        y_test[i] = j

    y_train = to_categorical(y_train, chosen_classes.shape[0])
    y_test = to_categorical(y_test, chosen_classes.shape[0])

    labels = ["grain", "crude-oil", "money-fx", "acquisition", "earns"]

    exp.addForExport(labels, "classes")

    return x_train, x_test, y_train, y_test, id_to_word, labels


def extractData(model, x_test, y_test, test_indexes, id_to_word):
    predictions = np.argmax(model.predict(x_test[test_indexes]), axis=1)
    actual_values = np.argmax(y_test[test_indexes].reshape((test_indexes.shape[0], 5)), axis=1)
    correct_preds = predictions == actual_values
    texts = [[id_to_word[w] for w in text if id_to_word[w] != '<PAD>' and id_to_word[w] != '<START>'] for text in
              x_test[test_indexes]]
    #texts = [[id_to_word[word] for word in text] for text in x_test[test_indexes]]

    exp.addForExport(texts, "texts")
    exp.addForExport(actual_values, "actualValues")
    exp.addForExport(predictions, "predictions")

    return predictions, actual_values, correct_preds, texts


def main():
    global randomSeed

    numSequences = 500
    lstmUnits = 20
    outputUnits = 5
    sequenceLength = 100
    activation = 'softmax'

    randomStatePCA = 99
    randomStateTSNE = 42
    perplexityTSNE = 100

    x_train, x_test, y_train, y_test, id_to_word, labels = prepareData(sequenceLength)

    test_indexes = np.arange(numSequences)
    # all sequences: test_indexes = np.arange(y_test.shape[0])
    sample_size = test_indexes.shape[0]

    model = s.createModel(x_train, lstmUnits, outputUnits, activation)
    model_lstm, model_pred = s.trainModel(model, x_train, x_test, y_train, y_test, lstmUnits, outputUnits, activation, randomSeed)

    hidden_states, hs_shape = s.calculateHiddenStates(model_lstm, x_test[test_indexes])
    model_outputs, true_outputs = s.modelOutputs(hidden_states, y_test, model_pred, sample_size, lstmUnits)

    extractData(model, x_test, y_test, test_indexes, id_to_word)

    hs_nopad, mo_nopad = s.filterHiddenStates(x_test, sample_size, hidden_states, model_outputs)

    # PCA
    projection_nopad = s.pcaProjection(hs_nopad, randomStatePCA)
    s.reshape(projection_nopad, mo_nopad, hs_nopad, x_test, sample_size)
    exp.writeJson("projection_pca_nopad_rs" + str(randomStatePCA), randomSeed)

    # t-SNE
    projection_nopad = s.tsneProjection(hs_nopad, randomStateTSNE, perplexityTSNE)
    s.reshape(projection_nopad, mo_nopad, hs_nopad, x_test, sample_size)
    exp.writeJson("projection_tsne_nopad_rs" + str(randomStateTSNE) + "_p" + str(perplexityTSNE), randomSeed)


if __name__ == "__main__":
    main()