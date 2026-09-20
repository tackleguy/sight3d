import { executeTool } from '../../../implementations/ai.chat/AIService';
import type { IModelAPI } from '../../../implementations/api.model/ModelAPI';

test('local box tool uses the modeling API with validated meter dimensions', async () => {
  const createBox = jest.fn(() => ({ faceIds:['face'], edgeIds:['edge'], vertexIds:['vertex'] }));
  const result = JSON.parse(await executeTool({ createBox } as unknown as IModelAPI, 'create_box', {width:2,depth:3,height:4}));
  expect(createBox).toHaveBeenCalledWith({x:0,y:0,z:0},2,3,4);
  expect(result).toMatchObject({ok:true,created:{faces:['face']}});
});
test.each([0,-1,NaN,Infinity,'1',undefined])('rejects invalid box dimension %s without mutation', async width => {
  const createBox=jest.fn();
  const result=JSON.parse(await executeTool({createBox} as unknown as IModelAPI,'create_box',{width,depth:1,height:1}));
  expect(result.ok).toBe(false);
  expect(createBox).not.toHaveBeenCalled();
});
