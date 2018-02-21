**Meteor Mango** is a simple, lightweight alternative to collection-hooks and can auto sync relational data. Say hello to a more maintainable codebase. However collection-hooks can cause spaghetti code, so don't overuse them!

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

In this example, we trigger a sync upon changes to the Group's `name`.

```javascript
import Mango from 'meteor-mango';
import {pick, isEqual} from 'underscore';

const GROUPS_SCHEMA = {name: String, addedOn: Date};
const MEMBERS_SCHEMA = {username: String, groups: [{_id: String, name: String}]};

const Groups = new Mango('Groups', {
    schema: GROUPS_SCHEMA,
    toEmbedded: (newDoc) => pick(newDoc, '_id', 'name'),
});
const Members = new Mango('Members', {schema: MEMBERS_SCHEMA});

Groups.autorun({
    onChange(id, embeddedDoc) {
        Members.update({'groups._id': id}, {$set: {'groups.$': embeddedDoc}}, {multi:true});
    },
    onRemove(id) {
        Members.update({'groups._id': id}, {$pull: {'groups': {'_id': id}}}, {multi:true});
    }
});
```

When we run this code, the groups update will automatically trigger the `onChange` event declared in `autorun`

```javascript
let {id, embeddedDoc} = Groups.insert({name: 'Foreskin', createdOn: new Date()});
let {doc} = Members.insert({name: 'Bob', groups: [embeddedDoc]});
Groups.update(groupId, {$set: {'name': 'Threeskin'}});
```