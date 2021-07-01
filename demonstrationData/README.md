# Demonstration Data

We provide preprocessed datasets for our visual analytics system for the IMDB [1] and Reuters [2] dataset available in Keras [3].
The original dataset is licensed under [Apache V2.0](https://github.com/keras-team/keras/blob/master/LICENSE).
We processed the dataset with our data preparation scripts ([imdbLstms.py](../dataPreparation/imdbLstms.py) and [reutersLstms.py](../dataPreparation/reutersLstms.py)) in order to generate input data for our visual analytics system.

In order to use the datasets in the visual analytics system, the correct paths have to be defined in [userData.toml](../visualAnalytics/userData.toml) of the visual analytics system (by default, the correct paths are set).

The data was generated with Python 3.7.10, Tensorflow 1.14.0, Keras 2.3.1, and Numpy 1.16.4.

## IMDB

The preprocessed IMDB dataset was created with the preprocessing script [imdbLstms.py](../dataPreparation/imdbLstms.py).

We used the first 100 sequences, the random state 99 for Python and TensorFlow; for t-SNE, the random state 9999, and perplexity 100 were used.
Form each text sequence, the last 100 words were used and 100 hidden state units for LSTM.

## Reuters

The preprocessed Reuters dataset was created with the preprocessing script [reutersLstms.py](../dataPreparation/reutersLstms.py).

We used the first 500 sequences, the random state 101 for python and TensorFlow; for t-SNE, the random state 42, and perplexity 100 were used.
Form each text sequence, the last 100 words were used and 20 hidden state units for LSTM.

&nbsp;

[1] Maas, A.L., Daly, R.E., Pham, P.T., Huang, D., Ng, A.Y., Potts, C.: Learning word vectors for sentiment analysis. 
In: Proceedings of the 49th Annual Meeting of the Association for Computational Linguistics: Human Language Technologies, pp. 142–150.
Association for Computational Linguistics, USA (2011)

[2] Reuters Ltd.: Reuters-21578 Dataset (1996)

[3] Chollet, F.: Keras. GitHub. https://github.com/fchollet/keras (2015)