// routes/poiRoutes.ts
import express from 'express';
import { 
  getAllPOIs, 
  createPOI, 
  updatePOI, 
  deletePOI, 
  getNearbyPOIs,
  getPOIById 
} from '../controllers/poiController';
const router = express.Router();

router.get('/', getAllPOIs);
router.get('/:id', getPOIById);
router.post('/', createPOI);
router.put('/:id', updatePOI);
router.delete('/:id', deletePOI);
router.get('/nearby', getNearbyPOIs);

export default router;
