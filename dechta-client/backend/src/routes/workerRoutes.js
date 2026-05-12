'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/workerController');

router.get('/active', ctrl.getApprovedWorkers);
router.post('/:id/hire', ctrl.hireWorker);
router.get('/jobs/:jobId', ctrl.getJobStatus);

module.exports = router;
