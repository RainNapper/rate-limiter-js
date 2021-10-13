import { Moment } from "moment";

let lastRequestId = 1000;
const nextRequestId = () => {
  lastRequestId++;
  return lastRequestId;
}

export type IRequest = {
  id: number,
  method: string,
  args: string,
  expiration: Moment
};
export type IResponse = {
  requestId: number,
  code: number,
  body: string,
  expiration: Moment
}

const requests: { [key: string]: IRequest } = {};
const responses: { [key: string]: IResponse } = {};


const saveRequest = async (req: IRequest) => {
  requests[req.id] = req;
}

const saveResponse = async (res: IResponse) => {
  responses[res.requestId] = res;
}

export {
  saveRequest,
  saveResponse,
  nextRequestId,
}
