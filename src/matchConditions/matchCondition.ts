import { ASTNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';

type matchCondition = (nodeAndVarDefs: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>) => boolean;

export default matchCondition;
