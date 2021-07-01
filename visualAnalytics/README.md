# Visual Analytics System

![Screenshot of application](../app.png?raw=true)

Source code of our visual analytics system.

The output file of our data preparation scripts or the ones provided for demonstration can be loaded in our visual analytics system for visualization and analysis.
Since we provide input files, you do not have to run the preprocessing steps and can use our visual analytics system immediately.

## Dependencies

Our system uses the packages listed in the requirements file.
Additionally, we use D3.js for the visual components.

We tested our approach with Python 3.7 and 3.8.

## Starting the Visual Analytics System

You can use our system as follows:

Linux:
```bash
pip3 install -r requirements.txt

export FLASK_APP=exploreData.py
flask run --host=0.0.0.0 -p 3000
```
As alternative, we provide the scrips [initEnv.sh](initEnv.sh) and [start.sh](start.sh) for initialization of a virtual environment and to start the system.

Windows:

```bash
pip install -r requirements.txt

set FLASK_APP=exploreData.py
flask run --host=0.0.0.0 -p 3000
```

You can start the web application in a browser with [http://localhost:3000](http://localhost:3000).

In [userData.toml](userData.toml), the correct paths to the data sets have to be defined. By default, the data sets available as demonstration data will be used.
