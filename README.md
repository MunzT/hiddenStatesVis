# Visual Analytics System for Hidden States in Recurrent Neural Networks

![Screenshot of application](app.png?raw=true)

Visual analytics system for the analysis of hidden states in recurrent neural networks.

You can find more information about our approach in the publication 
*A Visual Analytics Tool for the Interpretation of Hidden States in Recurrent Neural Networks* (see below).

This project contains source code for pre-processing IMDB and Reuters data available in Keras [1] and the visual analytics system itself. 
Additionally, we added precomputed data for immediate use in the visual analytics system.

The sub directories contain the following:

- `dataPreparation`: Python scripts to prepare data for analysis. In these scripts, LSTM models are trained and data for our visual analytics system is exported.

- `visualAnalytics`: The source code of our visual analytics system to explore hidden states.

- `demonstrationData`: Data files for the use with our visual analytics system. The same data can also be generated with the data preparation scripts.

## Dependencies

Our system uses the packages listed in the requirements files in each subdirectory.
For the visual analytics system D3.js is used for the visualizations.

## License

Our project is licensed under the [MIT License](LICENSE.md).

## Citation

When referencing our work, please cite our paper *A Visual Analytics Tool for the Interpretation of Hidden States in Recurrent Neural Networks*.

R. Garcia, T. Munz, and D. Weiskopf. A Visual Analytics Tool for the Interpretation of Hidden States in Recurrent Neural Networks. Visual Computing for Industry, Biomedicine, and Art (VCIBA). 2021. 

```
@article{vciba2021hiddenStates,
  author    = {Garcia, Rafael and Munz, Tanja and and Weiskopf, Daniel},
  title     = {A Visual Analytics Tool for the Interpretation of Hidden States in Recurrent Neural Networks},
  journal   = {Visual Computing for Industry, Biomedicine, and Art (VCIBA)},
  year      = {2021},
}
```
&nbsp;

[1] Chollet, F.: Keras. GitHub.https://github.com/fchollet/keras (2015)