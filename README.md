`meteor npm install --save meteor-mango`

**Meteor Mango** is a simple, lightweight alternative to collection-hooks and can auto sync relational data. Say hello to a more maintainable codebase. However collection-hooks can cause spaghetti code, so don't overuse them!

### Relational Example

In this test database, members can join groups, so we store a list of groups on the member. This is called embedding. However, if you update the name in the `Groups` collection, by default, the duplicated names in the embedded arrays will keep the old name. With `meteor-mango` we can fix that with less code, and in a less error-prone way than doing it mannually.

```javascript
import Mango from 'meteor-mango';
import {pick, isEqual} from 'underscore';

// Define schemas for two collections
const GROUPS_SCHEMA = {_id: String, name: String, addedOn: Date};
const MEMBERS_SCHEMA = {_id: String, username: String, groups: [{_id: String, name: String}]};

// Create two sexy mangos
const Groups = new Mango('Groups', {
    schema: GROUPS_SCHEMA,
    toEmbedded: (newDoc) => pick(newDoc, '_id', 'name'),
});
const Members = new Mango('Members', {schema: MEMBERS_SCHEMA});

// Attach autorun functions to Groups
Groups.autorun({
    onChange(id, embeddedDoc) {
        Members.update({'groups._id': id}, {$set: {'groups.$': embeddedDoc}}, {multi:true});
    },
    onRemove(id) {
        Members.update({'groups._id': id}, {$pull: {'groups': {'_id': id}}}, {multi:true});
    }
});
```

Because you configured a toEmbedded function and attached an autorun, the update on line 3 will trigger the `onChange` event declared in `autorun`. That will make sure your Members embeds are properly kept up to date!

```javascript
let {id, embeddedDoc} = Groups.insert({name: 'Foreskin', createdOn: new Date()});
Members.insert({name: 'Bob', groups: [embeddedDoc]});
Groups.update(id, {$set: {'name': 'Threeskin'}});
```

### Schema Enforcement Aka Collection2 (in progress)

Did you know mango also replaces collection2? Is there anything Mango can't do?!

```javascript
const Groups = new Mango('Groups', {
    schema: {_id: String, name: String, addedOn: Date},
});
```
