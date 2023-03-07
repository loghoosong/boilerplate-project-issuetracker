const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);
let idToUpdate, idToDelete;
suite('Functional Tests', function () {
    this.timeout(5000);
    suite('Post', function () {
        // #1
        test('Create an issue with every field', function (done) {
            chai.request(server)
                .post('/api/issues/apitest')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({
                    issue_title: "The issue to be delete",
                    issue_text: "describing the issue....",
                    created_by: "loghoosong",
                    open: true,
                    assigned_to: "The person who has to put out the fire",
                    status_text: "ready to be assigned",
                })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    idToDelete = res.body._id;
                    assert.isNotNull(idToDelete);
                    done();
                });
        });
        // #2
        test('Create an issue with only required fields', function (done) {
            chai.request(server)
                .post('/api/issues/anotherProject')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({
                    issue_title: "The issue to be update",
                    issue_text: "describing the issue....",
                    created_by: "loghoosong",
                })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    idToUpdate = res.body._id;
                    assert.isNotNull(idToUpdate);
                    assert.isDefined(res.body.assigned_to);
                    done();
                });
        });
        // #3
        test('Create an issue with missing required fields', function (done) {
            chai.request(server)
                .post('/api/issues/apitest')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({
                    issue_title: "The issue with only title",
                })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { error: 'required field(s) missing' });
                    done();
                });
        });
    });
    suite('Get', function () {
        // #4
        test('View issues on a project', function (done) {
            chai.request(server)
                .get('/api/issues/apitest')
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.typeOf(res.body, 'array');
                    assert.isDefined(res.body[0]._id);
                    assert.isDefined(res.body[0].assigned_to);
                    assert.isDefined(res.body[0].status_text);
                    done();
                });
        });
        // #5
        test('View issues on a project with one filter', function (done) {
            chai.request(server)
                .get('/api/issues/anotherProject')
                .query({ _id: idToUpdate })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.typeOf(res.body, 'array');
                    assert.equal(res.body[0]._id, idToUpdate);
                    done();
                });
        });
        // #6
        test('View issues on a project with multiple filters', function (done) {
            chai.request(server)
                .get('/api/issues/anotherProject')
                .query({ created_by: "loghoosong", open: true })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.typeOf(res.body, 'array');
                    for (let issue of res.body) {
                        assert.equal(issue.created_by, 'loghoosong');
                        assert.equal(issue.open, true);
                    }
                    done();
                });
        });
    });
    suite('Put', function () {
        // #7
        test('Update one field on an issue', async function () {
            const resPut = await chai.request(server)
                .put('/api/issues/anotherProject')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({
                    _id: idToUpdate,
                    issue_title: 'A new title',
                });
            //console.log(resPut);
            assert.equal(resPut.status, 200);
            assert.deepEqual(resPut.body, { result: 'successfully updated', _id: idToUpdate });

            const resGet = await chai.request(server)
                .get('/api/issues/anotherProject')
                .query({ _id: idToUpdate });
            assert.equal(resGet.status, 200);
            assert.typeOf(resGet.body, 'array');
            assert.equal(resGet.body[0]._id, idToUpdate);
            assert.equal(resGet.body[0].issue_title, 'A new title');
            assert.isAbove(new Date(resGet.body[0].updated_on), new Date(resGet.body[0].created_on));
        });
        // #8
        test('Update multiple fields on an issue', async function () {
            const resPut = await chai.request(server)
                .put('/api/issues/anotherProject')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({
                    _id: idToUpdate,
                    issue_title: 'Title be updated',
                    issue_text: 'Text be updated'
                });
            assert.equal(resPut.status, 200);
            assert.deepEqual(resPut.body, { result: 'successfully updated', _id: idToUpdate });

            const resGet = await chai.request(server)
                .get('/api/issues/anotherProject')
                .query({ _id: idToUpdate });
            assert.equal(resGet.status, 200);
            assert.typeOf(resGet.body, 'array');
            assert.equal(resGet.body[0]._id, idToUpdate);
            assert.equal(resGet.body[0].issue_title, 'Title be updated');
            assert.equal(resGet.body[0].issue_text, 'Text be updated');
            assert.isAbove(new Date(resGet.body[0].updated_on), new Date(resGet.body[0].created_on));
        });
        // #9
        test('Update an issue with missing _id', function (done) {
            chai.request(server)
                .put('/api/issues/anotherProject')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({})
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { error: 'missing _id' });
                    done();
                });
        });
        // #10
        test('Update an issue with no fields to update', function (done) {
            chai.request(server)
                .put('/api/issues/anotherProject')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({ _id: idToUpdate })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { error: 'no update field(s) sent', '_id': idToUpdate });
                    done();
                });
        });
        // #11
        test('Update an issue with an invalid _id', function (done) {
            chai.request(server)
                .put('/api/issues/anotherProject')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({
                    _id: idToDelete,
                    open: false,
                })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { error: 'could not update', '_id': idToDelete });
                    done();
                });
        });
    });
    suite('delete', function () {
        // #12
        test('Delete an issue', async function () {
            const resDel = await chai.request(server)
                .delete('/api/issues/apitest')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({ _id: idToDelete });
            assert.equal(resDel.status, 200);
            assert.deepEqual(resDel.body, { result: 'successfully deleted', '_id': idToDelete });

            const resGet = await chai.request(server)
                .get('/api/issues/apitest')
                .query({ _id: idToDelete });
            assert.equal(resGet.status, 200);
            assert.typeOf(resGet.body, 'array');
            assert.equal(resGet.body.length, 0);
        });
        // #13
        test('Delete an issue with an invalid _id', function (done) {
            chai.request(server)
                .delete('/api/issues/apitest')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({ _id: idToUpdate })
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { error: 'could not delete', '_id': idToUpdate });
                    done();
                });
        });
        // #14
        test('Delete an issue with missing _id', function (done) {
            chai.request(server)
                .delete('/api/issues/apitest')
                .set('content-type', 'application/x-www-form-urlencoded')
                .send({})
                .end((err, res) => {
                    assert.equal(res.status, 200);
                    assert.deepEqual(res.body, { error: 'missing _id' });
                    done();
                });
        });
    });
});
