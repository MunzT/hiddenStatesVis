#!/bin/bash
source env/bin/activate 
echo env started
export FLASK_APP=exploreData.py
flask run --host=0.0.0.0 -p 3000
