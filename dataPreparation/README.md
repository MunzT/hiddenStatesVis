# Data Preparation

We provide two scripts to generate data for analysis in our visual analytics system: for the IMDB [1] and Reuters [2] dataset as available in Keras [3].
The output files can then be loaded into our visual analytics system; their locations have to be specified in [userData.toml](../visualAnalytics/userData.toml) of the visual analytics system.

## Dependencies

Our system uses the packages listed in the requirements files.

In particular, we developed our approach with Python 3.7.10, Tensorflow 1.14.0, Keras 2.3.1, and Numpy 1.16.4.

## Preparing the Data

```bash
pip3 install -r requirements.txt

python3 reutersLstms.py [rs]

python3 imdbLstms.py [rs]
```

rs stands for the random state used by Python and Tensorflow.
In case rs is not given, the same values are used that were used for the example data.

You can find preprocessed datasets in the directory `demonstrationData` for immediate use in our visual analytics system.

&nbsp;

[1] Maas, A.L., Daly, R.E., Pham, P.T., Huang, D., Ng, A.Y., Potts, C.: Learning word vectors for sentiment analysis. 
In: Proceedings of the 49th Annual Meeting of the Association for Computational Linguistics: Human Language Technologies, pp. 142–150.
Association for Computational Linguistics, USA (2011)

[2] Reuters Ltd.: Reuters-21578 Dataset (1996)

[3] Chollet, F.: Keras. GitHub. https://github.com/fchollet/keras (2015)
