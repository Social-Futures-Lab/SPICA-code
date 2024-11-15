# Annotation Interface

This folder contains the code for the annotation and evaluation interfaces, including the frontend and backend code. This code is designed to use recruitment from Prolific, but can also support manual recruitment or other platforms like Amazon Mechanical Turk with minimal edits. 

## Demo

You can try out the frontend of this code [here]().

## Frontend

The frontend code uses custom components with the task management system built from `amt-shim`.

## Backend

The backend code handles 2 main tasks: assignment of tasks to groups, and collection of user submitted results. Most of the backend is built off of Flask but mainly serves to provide APIs.

### Setup and Deployment

To initialize the backend, configure `.env` with the corresponding values, start the flask app with `python app.py` and load `http://127.0.0.1:5000/admin/init-db` to create the initial database.

As many platforms today require HTTPS, we advise deploying this flask application behind a forwarding proxy that wraps HTTPS. For details on how to set this up, consult [these example instructions](https://www.digitalocean.com/community/tutorials/how-to-configure-nginx-as-a-reverse-proxy-on-ubuntu-22-04) and follow the most recent instructions on setting up free SSL certificates through [Let's Encrypt](https://letsencrypt.org/).

### Task Initialization

Before the system can assign tasks, you need to first populate the `tasks` table.
