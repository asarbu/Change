# Coding guidelines

## Naming
Use camelCase when declaring variables and methods.
Use CamelCase when declaring classes.
Use camelCase when declaring IDs in HTML elements. This is especially useful in Javascript because the browser automatically creates a variable with the same name as your ID. It is easy to fetch DOM elements from Javascript in this way.

## Behavior
Do not rely on non deterministic components (e.g. Random number generators, system clock, persistence or I/O), but rather inject it. it makes the code testable, loggable and repeatable.
[Mark Seemann - Repeatable execution (personal blogpost-2020)](https://blog.ploeh.dk/2020/03/23/repeatable-execution/)
[Mark Seemann - Repeatable execution (talk at NDC 2022)](https://youtu.be/Ak1hGQuGBhY)
**Example**
If you have a GUI component that creates a `Planning` object (which should receive a unique ID), you might think to use `new Date().getTime()` as a unique identifier.
This is an incorrect approach as you will never be able to properly test behaviour, replicate past events and debug the code.
A better approach would be to inject a `DateTimeProvider` interface in the GUI component that has a `getTime()` function. You can use a real `Date` object in production and a stubbed `DateTimeProvider` during tests. 

## Code
### Sizing
Each method should not have more than 7 concepts in scope (parameters, variables, object attributes, cyclomatic complexity) so it fits in human short term memory.
[Miller's law](https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two)
**Example** 
1. If a function has the cyclomatic complexity of two, has one parameter and uses three variables, it is at the edge of human short term memory. (2 + 1+ 3 = 6 concepts)
2. If a function has a cyclomatyc complexity of three, two parameters and uses 3 variables it should be refactored (3 + 2 + 3 = 8)

Each class should not have more than 7 attributes. 
Exceptionally, some concepts might fit together so the number can increase if it makes sense.
**Example** A GUI class might consider Edit/Save handling as a single concept, since they belong together.

### Organizing classes / modules
Put the static attributes, then static methods above the instance attributes and instance methods in the class declaration.
Do not leave public attributes in classes. Make the objects immutable instead.

### Passing parameters to functions
Parameters should not be of primitive types.
[Kris Jenkins - Communicating in types (talk at GOTO 2024)](https://youtu.be/SOz66dcsuT8?list=PLchLtXZT9qlHDSBEEbIidQAoF60r1Pl8Y)
1. Booleans make the function calls hard to read. 
Either split the function into multiple functions or create an enumeration. 
**Example** :
In class Effects there is a function `moveToIndex` that moves the current visible slice to a different slice using an index. It has a parameter to allow jumping instead of sliding. The call looks like this: `effects.moveToIndex(sliceIndex, true)` 
By splitting the function into `effects.slideTo(sliceIndex)` and `effects.jumpTo(sliceIndex)` the boolean parameter disappears and the code is easier to read.
2. Strings allow for undefined behaviour to be injected in functions, potentially leading to errors. We should abstract the string type as much as possible using enumerations/classes, so that only valid values are passed as parameters. Obvious exceptions are user inputs, which should be validated even before the user gets a chance to type them (using HTML input types, regular expressions, etc.).
**Example** 
We have a class `Statement` that has a `type` string attribute. It is very easy for the user or the programmer to change the Stetement type to an invalid type.
Instead, the `type` string attribute should be abstracted as an anumeration `StatementType` with the desired values: `Income`, `Expense`, `Saving`. This also avoids any potential typos in the code.
**Example**
In the class `GDriveAuth` we need to have a boolean parameter to know if the user wants to have his login remembered or not.
Instead of sending a boolean parameter called `rememberLogin` you should send a class together with all the settings needed for authentication (e.g. `GDriveSettings` class instance).

### Binding
Use arrow functions inside classes to avoid the necessity of binding them outside the class scope
**Example**
```
class Foo {
constructor (x) {
      this.x = x;
  }

  foo = (v) => { // using arrow function to ensure this is bound
    return this.x + v;
  }
}

const s = new Foo(2);
[1,2,3].map(s.foo); // no problem passing this as it is bound
```

## Event handlers

Every change in the state of the application should lead to the creation of an immutable entity. The entity is passed around using an observer pattern.
Other layers / components should subscribe to the events (change, create, edit, delete, etc) by passing an event handler to the **on<event><objectName>** function. This new function might receive the new immutable entity.
In case the event does not alter the state of the model but requries feedback (e.g display a modal when a button is clicked), no new entities should be created.

### Recommended Event verbs

Use **change** verb when you replace/swap one object with another
Use **edit** verb when you when you alter the state of the same object
Use **insert** in methods name instead of **add** for clarity. You may use **add** in interface if it saves space.

Use **on<event><objectName>** when creating a subscribe method (callback setter)
Use **on<event>ed<objectName>** when handling an action (event handler)
**Example:**
1. `onChangeStatement(handler)` for declaring a function that takes a handler for the event of changing a statement (subscribes to the event of changing a statement)
2. `onChangedStatement(statement)` for declaring a function that handles the behaviour of the app when the statement is changed with the provided value

Use **<actionVerb><objectName>** when exposing an event publicly.
**Example**
1. `clickInsertStatement` for declaring a function that simulates a click on the **insert statement** button.

### Grouping handlers together
Put handler that are related in their own region.

# Testing
## Testing methods 
### Mocks
Mocks verify interactions . They are programmed with expected method calls and arguments. The tests asserts that the calls are made with the right data or the calls return the right data. Mocks should be avoided at all costs (due to coupling implementation details to the test) and mocking should be considered a code smell.
### Stubs
Stubs provide predetermined responses. They don't assert interactions, but return dummy values so the test can continue. They are prefferable to mocks. They can be used for calling slow dependencies (e.g. APIs, datbases, etc.).
### Fakes
Fakes are lightweight working implementations, but simpler, usually in-memory.
They can only be used if a dependency is not available, or if a stub is more difficult to implement (e.g. IndexedDB is not available in in Jest, and it is difficult to stub).

## Building tests
Tests should be built using AAA pattern.
### Arrange
The tests should not be fragile and they should be resistant to refactoring. To ensure this, the tester should create builders for most common tested objects. This ensures the tests are easy to read, the creation of the elements can be autocompleted and the builder itseld is reusable.
When the underlying model changes, we only update the builder.
### Act
The acting part of the test should be a one liner, testing the operation at hand.
### Assert
One may have multiple asserts at the end of the tests, if it makes sense (e.g. to avoid duplication)

**Example** While testing planning operations, we might need multiple types of objects, so the builder might return those common plannings:
```
describe('Planning cache', () => {
  it('stores one empty Planning object', async () => {
    // Arrange
    const countBeforeInsert = (await planningCache.count());
    const planning = planningBuilder.create();
    
    // Act
    await planningCache.create(planning);

    // Assert
    const countAfterInsert = (await planningCache.count());
    expect(countAfterInsert - countBeforeInsert).toBe(1);
  });

  it('stores one complex Planning object', async () => {
    // Arrange
    const countBeforeInsert = (await planningCache.count());
    const planning = planningBuilder
      .create()
      .withEmptyStatement()
      .withLargeStatement();
    
    // Act
    const storedPlanning = await planningCache.create(planning);

    // Assert
    const countAfterInsert = (await planningCache.count());
    expect(countAfterInsert - countBeforeInsert).toBe(1);
    expect(planning).toEqual(storedPlanning);
  });
});
```
### Input validation
Always use a submit type input for a form, to ensure that proper form validation is performed (e.g. `required` inputs are not left empty).
If the submit button has attached behabior, you should check beforehand if the form is valid
**Example**
```
new Dom('input').type('submit').attr('form', form-id').onClick(() => {
  const form = document.getElementById('form-id');
  if(form && form.checkValidity()) {
    this.doStuff();
    this.close();
  }
})
```