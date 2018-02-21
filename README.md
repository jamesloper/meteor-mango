Meteor Mango is a simple, lightweight alternative to collection2, simple-schema, and collection-hooks, and gives a mind blowingly simple pattern to help relational data in sync. Say hello to a more maintainable codebase. Well sort of. Collection-hooks can cause spaghetti code, so don't overuse them!

All functionality in 100 lines of code with no dependancies. Very pro code golf.

# Installation
To add to your project, just run `meteor npm install --save meteor-mango`

# Example
```javascript
import Mango from 'meteor-mango';
const Groups = new Mango('Groups', {
    _id: String,
    name: String,
    countMembers: Number,
});
Groups.insert({name: 'Dinosaur Eating Club'});
```

# Relational Example

In this example, we trigger a sync upon changes to the Artist's `name`. Note that if `name` was an object, and a sub field changed, this works as well. The change detection function is `EJSON.equals` by default, but is customizable by passing `comparisonFn`.

```javascript
import Mango from 'meteor-mango';
import {pick, isEqual} from 'underscore';

const Groups = new Mango({
    collectionName: 'Groups',
    schema: {name: String, addedOn: Date},
    toEmbedded: (newDoc) => pick(newDoc, '_id', 'name'),
    observeFields: ['name'],
});
const Members = new Mango({
    collectionName: 'Members',
    schema: {artist: {_id: String, photo: String, name: String}, name: String},
});

Artists.autoSync({
    collectionToUpdate: Albums,
    observeFields: ['name', 'photo'],
    query: (newDoc) => ({'artist._id': newDoc._id}),
    update: (embeddedDoc) => ({'artist': embeddedDoc}),
});

// Test this setup
let artist = {_id: 'artist_00001', name: 'Foreskin'};

let id = Artists.insert(artist);
const Albums = Albums.insert({
    artist: {_id: id, name: String},
    name: Number,
});

```
