#!/usr/bin/env python
# coding: utf-8

import sys

from keras.layers import Dense, LSTM, Dropout
from keras.layers.embeddings import Embedding
from keras.models import Sequential
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE

from shared.exportData import *


def wordToId(type, randomSeed):
    # Create a dict to transform word id into string.
    word_to_id = type.get_word_index()
    word_to_id = {k: (v + 3) for k, v in word_to_id.items()}
    word_to_id["<PAD>"] = 0
    word_to_id["<START>"] = 1
    word_to_id["<UNK>"] = 2

    id_to_word = {v: k for k, v in word_to_id.items()}

    return id_to_word, word_to_id


def createModel(x_train, lstmUnits, outputUnits, activation):
    # Instantiate the layers of the model.
    embedd = Embedding(input_dim=(np.max(x_train) + 1), output_dim=32, input_length=x_train.shape[1])
    lstm_1 = LSTM(units=lstmUnits)
    drop_2 = Dropout(rate=0.5)
    output = Dense(units=outputUnits, activation=activation)

    model = Sequential()
    model.add(embedd)
    model.add(lstm_1)
    model.add(drop_2)
    model.add(output)

    return model


def trainModel(model, x_train, x_test, y_train, y_test, lstmUnits, outputUnits, activation, randomSeed):
    original_stdout = sys.stdout

    # Train the model
    model.compile(loss='binary_crossentropy', optimizer='rmsprop', metrics=['accuracy'])
    h = model.fit(x_train, y_train, batch_size=64, epochs=5, validation_split=0.1)

    # Predictions of the test set.
    # y_pred = model.predict(x_test)

    # Evaluate the model.
    scores = model.evaluate(x_test, y_test, verbose=2)
    print("Accuracy: %.2f%%" % (scores[1]*100))
    addForExport("%.2f%%" % (scores[1] * 100), "model_accuracy")

    # Transfer weight to a new model to get LSTM activations.
    model_lstm = Sequential()
    model_lstm.add(Embedding(input_dim=(np.max(x_train) + 1), output_dim=32, input_length=x_train.shape[1]))
    model_lstm.add(LSTM(units=lstmUnits, return_sequences=True))

    model_lstm.layers[0].set_weights(model.layers[0].get_weights())
    model_lstm.layers[1].set_weights(model.layers[1].get_weights())

    # Transfer weights of the classification layer to generate outputs for each state.
    model_pred = Sequential()

    model_pred.add(Dropout(rate=0.5, input_shape=(model.layers[1].output_shape[1:])))
    model_pred.add(Dense(units=outputUnits, activation=activation))

    model_pred.layers[1].set_weights(model.layers[3].get_weights())

    sys.stdout = original_stdout

    return model_lstm, model_pred


def filterHiddenStates(x_test, sample_size, hidden_states, model_outputs):
    x_test_nopad = x_test[:sample_size].reshape((hidden_states.shape[0],))
    hs_nopad = hidden_states[x_test_nopad > 2]
    mo_nopad = model_outputs[x_test_nopad > 2]
    return hs_nopad, mo_nopad


def modelOutputs(hidden_states, y_test, model_pred, sample_size, lstmUnits):
    # Get the model output for every hidden state generated above.
    model_outputs = model_pred.predict(hidden_states)
    true_outputs = np.repeat(y_test[:sample_size], lstmUnits).reshape((-1, 1))
    return model_outputs, true_outputs


def calculateHiddenStates(model_lstm, sequences):
    # Generate the hidden states for every timestep in the first N observations of the training set.
    hs_output = model_lstm.predict(sequences)

    # Reshape in a single dataset.
    hs_shape = hs_output.shape
    hidden_states = hs_output.reshape((hs_shape[0]*hs_shape[1], hs_shape[2]))
    # activations = hs_output[:, -1, :]

    return hidden_states, hs_shape


def reshape(projection_nopad, mo_nopad, hs_nopad, x_test, sample_size):
    rehaped_projection_nopad = []
    rehaped_mo_nopad = []
    rehaped_hs_nopad = []

    for seq in range(sample_size):
        previous_seqs = x_test[:seq].flatten()
        previous_pads = previous_seqs[previous_seqs <= 2].shape[0]
        current_pads = x_test[seq].flatten()[x_test[seq].flatten() <= 2].shape[0]
        init = x_test.shape[1]*seq - previous_pads
        end = init + x_test.shape[1] - current_pads

        rehaped_projection_nopad.append(projection_nopad[init:end])

        rehaped_mo_nopad.append(mo_nopad[init:end])
        rehaped_hs_nopad.append(hs_nopad[init:end])

    addForExport(rehaped_mo_nopad, "modelOutputs")
    addForExport(rehaped_hs_nopad, "hiddenStates")
    addForExport(rehaped_projection_nopad, "projection")


def pcaProjection(hidden_states, rs):
    pca_proj = PCA(n_components=2, random_state=rs).fit_transform(hidden_states)
    return pca_proj


def tsneProjection(hidden_states, rs, p=100):
    tsne = TSNE(n_components=2, perplexity=p, early_exaggeration=12.0, verbose=1, random_state=rs).fit(hidden_states)
    projection = tsne.embedding_
    return projection
