#!/bin/sh
set -eu

# This runs once per `up`. An already initialized replica set is left intact.
mongosh --quiet --host mongo --eval '
  try {
    rs.status();
  } catch (error) {
    if (error.codeName !== "NotYetInitialized") throw error;
    rs.initiate({ _id: "meteor", members: [{ _id: 0, host: "mongo:27017" }] });
  }
'

attempt=0
until mongosh --quiet --host mongo --eval 'db.hello().isWritablePrimary' | grep -q true; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo 'MongoDB replica set did not become primary' >&2
    exit 1
  fi
  sleep 2
done
