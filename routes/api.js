'use strict';
const mongoose = require('mongoose');

module.exports = function (app) {
  const issueSchema = new mongoose.Schema({
    issue_title: { type: String, required: true },
    issue_text: { type: String, required: true },
    created_by: { type: String, required: true },
    assigned_to: { type: String, default: '' },
    status_text: { type: String, default: '' },
    created_on: { type: Date, default: Date.now },
    updated_on: { type: Date, default: Date.now },
    open: { type: Boolean, default: true },
  });

  const projectSchema = new mongoose.Schema({
    project: { type: String, required: true },
    issues: [issueSchema],
  });

  const Project = mongoose.model('Project', projectSchema);

  app.route('/api/issues/:project')
    //get是重点，post和put不通过，要先确认get没有问题
    .get(function (req, res) {
      let project = req.params.project;

      Project.findOne({ project }).then(
        doc => {
          if (!doc) {
            res.json({ error: 'project not found' });
            return;
          }

          if (req.query) {
            const objToMatch = Object.fromEntries(
              Object.entries(req.query).map(([k, v]) => {
                if (k == '_id') v = new mongoose.Types.ObjectId(v);    //_id要特殊处理
                k = 'issues.' + k;
                return [k, v];
              })
            );
            Project.aggregate([
              { $match: { project } },
              { $unwind: { path: '$issues' } },
              { $match: objToMatch }
            ]).then(
              data => {
                res.json(data.length > 0
                  ? data.map(item => item.issues) :
                  []);
              },
              err => { console.error(err); }
            );
          } else {
            res.json(doc.issues);
          }
        },
        err => { console.error(err); }
      );
    })

    .post(function (req, res) {
      let project = req.params.project;
      let body = req.body;
      if (!body.issue_title || !body.issue_text || !body.created_by) {
        res.json({ error: 'required field(s) missing' });
        return;
      }

      Project.findOne({ project }).then(
        doc => {
          if (!doc) {
            doc = new Project({ project });
          }

          const issue = doc.issues.create(body);
          doc.issues.push(issue);
          doc.save().then(
            () => { res.json(issue); },
            err => { res.json({ error: 'issue save err' }); }
          );
        },
        err => { console.error(err); }
      );
    })

    .put(function (req, res) {
      let project = req.params.project;
      let _id = req.body._id;

      const props = Object.entries(req.body).filter(([k, v]) => k != '_id' && v !== '');
      if (!_id) {
        res.json({ error: 'missing _id' });
        return;
      } else if (props.length === 0) {
        res.json({ error: 'no update field(s) sent', _id });
        return;
      }

      Project.findOne({ project }).then(
        doc => {
          if (!doc) {
            res.json({ error: 'could not update', _id });
            return;
          }

          const issue = doc.issues.id(_id);
          if (!issue) {
            res.json({ error: 'could not update', _id });
          } else {
            props.map(([k, v]) => { issue[k] = v; });
            issue['updated_on'] = Date.now();
            doc.save().then(
              () => { res.json({ result: 'successfully updated', _id }); },
              err => { res.json({ error: 'could not update', _id }); }
            );
          }
        },
        err => { res.json({ error: 'could not update', _id }); }
      );
    })

    .delete(function (req, res) {
      let project = req.params.project;
      let _id = req.body._id;
      if (!_id) {
        res.json({ error: 'missing _id' });
        return;
      }

      Project.findOne({ project }).then(
        doc => {
          if (!doc) {
            res.json({ error: 'could not delete', _id });
            return;
          }

          const issue = doc.issues.id(_id);
          if (!issue) {
            res.json({ error: 'could not delete', _id });
          } else {
            doc.issues.pull(_id);
            doc.save().then(
              () => { res.json({ result: 'successfully deleted', _id }); },
              err => { res.json({ error: 'could not delete', _id }); });
          }
        },
        err => { res.json({ error: 'could not delete', _id }); }
      );
    });

};
