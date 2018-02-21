**Meteor Mango** is a simple, lightweight alternative to collection2, simple-schema, and collection-hooks, and can auto sync relational data. Say hello to a more maintainable codebase. Collection-hooks can cause spaghetti code, so don't overuse them!

### Installation
To add to your project, just run `meteor npm install --save meteor-mango`

### Example
```javascript
import Mango from 'meteor-mango';
const Groups = new Mango('Groups', {
    _id: String,
    name: String,
    countMembers: Number,
});
Groups.insert({name: 'Dinosaur Eating Club'});
```

### Relational Example

In this example, we trigger a sync upon changes to the Artist's `name`. Note that if `name` was an object, and a sub field changed, this works as well. The change detection function is `EJSON.equals`.

```javascript
import Mango from 'meteor-mango';
import {pick, isEqual} from 'underscore';

const Groups = new Mango('Groups', {
    schema: {name: String, addedOn: Date},
    toEmbedded: (newDoc) => pick(newDoc, '_id', 'name'),
    triggerFields: ['name'],
    comparisonFn: EJSON.equals, // optional
});

const Members = new Mango('Members', {
    schema: {
        username: String,
        groups: [{_id: String, name: String}],
    },
});

Groups.autorun({
    onChange(id, embeddedDoc) {
        Members.update({'groups._id': id}, {$set: {'groups.$': embeddedDoc}}, {multi:true});
    },
    onRemove(id) {
        Members.update({'groups._id': id}, {$pull: {'groups': {'_id': id}}}, {multi:true});
    }
});

// Test this setup
let {id} = Groups.insert({
    name: 'Foreskin',
    createdOn: new Date(),
});

let member = Members.insert({
    name: 'Bob',
    groups: [group],
});

Groups.update(groupId, {$set: {'name': 'Threeskin'}});
```