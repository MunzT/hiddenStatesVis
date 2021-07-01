#!/usr/bin/env python
# coding: utf-8

# LSTM Hidden State Analysis: imdb

import sys

import shared.randomValues as randomValues

randomSeed = 99
if len(sys.argv) > 1:
    randomSeed = int(sys.argv[1])

print("Random seed: ", randomSeed)
randomValues.setSeeds(randomSeed)

from keras.datasets import imdb
from keras.preprocessing import sequence as sq

import shared.shared as s
import shared.exportData as exp

noBr = True

addition = ""
if noBr:
    addition = "noBr_"

exp.setExportDir("imdb_" + addition + str(randomSeed))


def prepareData(sequenceLength):
    (x_train, y_train), (x_test, y_test) = imdb.load_data()

    id_to_word, word_to_id = s.wordToId(imdb, randomSeed)

    global noBr
    if noBr:
        for i in range(x_train.shape[0]):
            x_train[i] = [x for x in x_train[i] if x != word_to_id['br']]
        for i in range(x_test.shape[0]):
            x_test[i] = [x for x in x_test[i] if x != word_to_id['br']]

    # Truncate and pad input sequences (fill with zeros if fewer words then max length).
    x_train = sq.pad_sequences(x_train, maxlen=sequenceLength)
    x_test = sq.pad_sequences(x_test, maxlen=sequenceLength)

    labels = ["negative", "positive"]
    exp.addForExport(labels, "classes")

    return x_train, x_test, y_train, y_test, id_to_word, labels


def extractData(model, x_test, y_test, sample_size, id_to_word):
    # predictions_float = model.predict(x_test[:sample_size])
    predictions = (model.predict(x_test[:sample_size]) > 0.5).astype(int)
    actual_values = y_test[:sample_size].reshape((sample_size, 1))
    correct_preds = predictions == actual_values
    texts = [[id_to_word[word] for word in text] for text in x_test[:sample_size]]

    global noBr
    if noBr:
        texts2 = [[id_to_word[w] for w in text if id_to_word[w] != '<PAD>' and id_to_word[w] != '<START>' and id_to_word[w] != 'br'] for text in x_test[:sample_size]]
    else:
        texts2 = [[id_to_word[w] for w in text if id_to_word[w] != '<PAD>' and id_to_word[w] != '<START>'] for text in x_test[:sample_size]]

    exp.addForExport(texts2, "texts")
    exp.addForExport(actual_values, "actualValues")
    exp.addForExport(predictions, "predictions")

    return predictions, actual_values, correct_preds, texts


def main():
    global randomSeed
    lstmUnits = 100
    outputUnits = 1
    sequenceLength = 100
    activation = 'sigmoid'
    sample_size = 100

    x_train, x_test, y_train, y_test, id_to_word, labels = prepareData(sequenceLength)
    model = s.createModel(x_train, lstmUnits, outputUnits, activation)
    model_lstm, model_pred = s.trainModel(model, x_train, x_test, y_train, y_test, lstmUnits, outputUnits, activation, randomSeed)

    hidden_states, hs_shape = s.calculateHiddenStates(model_lstm, x_test[:sample_size])
    model_outputs, true_outputs = s.modelOutputs(hidden_states, y_test, model_pred, sample_size, lstmUnits)

    extractData(model, x_test, y_test, sample_size, id_to_word)

    # Projection without paddings
    hs_nopad, mo_nopad = s.filterHiddenStates(x_test, sample_size, hidden_states, model_outputs)

    # t-SNE
    rs = 9999
    p = 100
    projection_nopad = s.tsneProjection(hs_nopad, rs, p)
    s.reshape(projection_nopad, mo_nopad, hs_nopad, x_test, sample_size)
    exp.writeJson("projection_tsne_nopad_rs" + str(rs) + "_p" + str(p), randomSeed)


if __name__ == "__main__":
    main()
