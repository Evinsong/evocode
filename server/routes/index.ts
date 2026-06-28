import { Router } from 'express';
import memoryRoutes from './memoryRoutes';
import skillRoutes from './skillRoutes';
import auditRoutes from './auditRoutes';
import settingsRoutes from './settingsRoutes';
import taskRoutes from './taskRoutes';
import codegenRoutes from './codegenRoutes';

const router = Router();

router.use('/memories', memoryRoutes);
router.use('/skills', skillRoutes);
router.use('/audit', auditRoutes);
router.use('/settings', settingsRoutes);
router.use('/tasks', taskRoutes);
router.use('/codegen', codegenRoutes);

export default router;
