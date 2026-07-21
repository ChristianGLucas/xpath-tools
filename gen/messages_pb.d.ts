// package: christiangeorgelucas.xpath_tools
// file: messages.proto

import * as jspb from "google-protobuf";

export class Error extends jspb.Message {
  getCode(): string;
  setCode(value: string): void;

  getMessage(): string;
  setMessage(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Error.AsObject;
  static toObject(includeInstance: boolean, msg: Error): Error.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Error, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Error;
  static deserializeBinaryFromReader(message: Error, reader: jspb.BinaryReader): Error;
}

export namespace Error {
  export type AsObject = {
    code: string,
    message: string,
  }
}

export class EvaluateXPathNodesRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathNodesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathNodesRequest): EvaluateXPathNodesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathNodesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathNodesRequest;
  static deserializeBinaryFromReader(message: EvaluateXPathNodesRequest, reader: jspb.BinaryReader): EvaluateXPathNodesRequest;
}

export namespace EvaluateXPathNodesRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class EvaluateXPathNodesResult extends jspb.Message {
  clearNodesList(): void;
  getNodesList(): Array<string>;
  setNodesList(value: Array<string>): void;
  addNodes(value: string, index?: number): string;

  getCount(): number;
  setCount(value: number): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathNodesResult.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathNodesResult): EvaluateXPathNodesResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathNodesResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathNodesResult;
  static deserializeBinaryFromReader(message: EvaluateXPathNodesResult, reader: jspb.BinaryReader): EvaluateXPathNodesResult;
}

export namespace EvaluateXPathNodesResult {
  export type AsObject = {
    nodesList: Array<string>,
    count: number,
    error?: Error.AsObject,
  }
}

export class EvaluateXPathStringRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathStringRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathStringRequest): EvaluateXPathStringRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathStringRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathStringRequest;
  static deserializeBinaryFromReader(message: EvaluateXPathStringRequest, reader: jspb.BinaryReader): EvaluateXPathStringRequest;
}

export namespace EvaluateXPathStringRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class EvaluateXPathStringResult extends jspb.Message {
  getValue(): string;
  setValue(value: string): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathStringResult.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathStringResult): EvaluateXPathStringResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathStringResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathStringResult;
  static deserializeBinaryFromReader(message: EvaluateXPathStringResult, reader: jspb.BinaryReader): EvaluateXPathStringResult;
}

export namespace EvaluateXPathStringResult {
  export type AsObject = {
    value: string,
    error?: Error.AsObject,
  }
}

export class EvaluateXPathNumberRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathNumberRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathNumberRequest): EvaluateXPathNumberRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathNumberRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathNumberRequest;
  static deserializeBinaryFromReader(message: EvaluateXPathNumberRequest, reader: jspb.BinaryReader): EvaluateXPathNumberRequest;
}

export namespace EvaluateXPathNumberRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class EvaluateXPathNumberResult extends jspb.Message {
  getValue(): number;
  setValue(value: number): void;

  getIsNan(): boolean;
  setIsNan(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathNumberResult.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathNumberResult): EvaluateXPathNumberResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathNumberResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathNumberResult;
  static deserializeBinaryFromReader(message: EvaluateXPathNumberResult, reader: jspb.BinaryReader): EvaluateXPathNumberResult;
}

export namespace EvaluateXPathNumberResult {
  export type AsObject = {
    value: number,
    isNan: boolean,
    error?: Error.AsObject,
  }
}

export class EvaluateXPathBooleanRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathBooleanRequest.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathBooleanRequest): EvaluateXPathBooleanRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathBooleanRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathBooleanRequest;
  static deserializeBinaryFromReader(message: EvaluateXPathBooleanRequest, reader: jspb.BinaryReader): EvaluateXPathBooleanRequest;
}

export namespace EvaluateXPathBooleanRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class EvaluateXPathBooleanResult extends jspb.Message {
  getValue(): boolean;
  setValue(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): EvaluateXPathBooleanResult.AsObject;
  static toObject(includeInstance: boolean, msg: EvaluateXPathBooleanResult): EvaluateXPathBooleanResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: EvaluateXPathBooleanResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): EvaluateXPathBooleanResult;
  static deserializeBinaryFromReader(message: EvaluateXPathBooleanResult, reader: jspb.BinaryReader): EvaluateXPathBooleanResult;
}

export namespace EvaluateXPathBooleanResult {
  export type AsObject = {
    value: boolean,
    error?: Error.AsObject,
  }
}

export class CountXPathRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CountXPathRequest.AsObject;
  static toObject(includeInstance: boolean, msg: CountXPathRequest): CountXPathRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CountXPathRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CountXPathRequest;
  static deserializeBinaryFromReader(message: CountXPathRequest, reader: jspb.BinaryReader): CountXPathRequest;
}

export namespace CountXPathRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class CountXPathResult extends jspb.Message {
  getCount(): number;
  setCount(value: number): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): CountXPathResult.AsObject;
  static toObject(includeInstance: boolean, msg: CountXPathResult): CountXPathResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: CountXPathResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): CountXPathResult;
  static deserializeBinaryFromReader(message: CountXPathResult, reader: jspb.BinaryReader): CountXPathResult;
}

export namespace CountXPathResult {
  export type AsObject = {
    count: number,
    error?: Error.AsObject,
  }
}

export class ExtractTextRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExtractTextRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ExtractTextRequest): ExtractTextRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExtractTextRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExtractTextRequest;
  static deserializeBinaryFromReader(message: ExtractTextRequest, reader: jspb.BinaryReader): ExtractTextRequest;
}

export namespace ExtractTextRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class ExtractTextResult extends jspb.Message {
  clearTextsList(): void;
  getTextsList(): Array<string>;
  setTextsList(value: Array<string>): void;
  addTexts(value: string, index?: number): string;

  getCount(): number;
  setCount(value: number): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExtractTextResult.AsObject;
  static toObject(includeInstance: boolean, msg: ExtractTextResult): ExtractTextResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExtractTextResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExtractTextResult;
  static deserializeBinaryFromReader(message: ExtractTextResult, reader: jspb.BinaryReader): ExtractTextResult;
}

export namespace ExtractTextResult {
  export type AsObject = {
    textsList: Array<string>,
    count: number,
    error?: Error.AsObject,
  }
}

export class ExtractAttributeRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExtractAttributeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ExtractAttributeRequest): ExtractAttributeRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExtractAttributeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExtractAttributeRequest;
  static deserializeBinaryFromReader(message: ExtractAttributeRequest, reader: jspb.BinaryReader): ExtractAttributeRequest;
}

export namespace ExtractAttributeRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class ExtractAttributeResult extends jspb.Message {
  clearValuesList(): void;
  getValuesList(): Array<string>;
  setValuesList(value: Array<string>): void;
  addValues(value: string, index?: number): string;

  getCount(): number;
  setCount(value: number): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExtractAttributeResult.AsObject;
  static toObject(includeInstance: boolean, msg: ExtractAttributeResult): ExtractAttributeResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExtractAttributeResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExtractAttributeResult;
  static deserializeBinaryFromReader(message: ExtractAttributeResult, reader: jspb.BinaryReader): ExtractAttributeResult;
}

export namespace ExtractAttributeResult {
  export type AsObject = {
    valuesList: Array<string>,
    count: number,
    error?: Error.AsObject,
  }
}

export class TransformXsltRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXslt(): string;
  setXslt(value: string): void;

  getParamsMap(): jspb.Map<string, string>;
  clearParamsMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TransformXsltRequest.AsObject;
  static toObject(includeInstance: boolean, msg: TransformXsltRequest): TransformXsltRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TransformXsltRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TransformXsltRequest;
  static deserializeBinaryFromReader(message: TransformXsltRequest, reader: jspb.BinaryReader): TransformXsltRequest;
}

export namespace TransformXsltRequest {
  export type AsObject = {
    xml: string,
    xslt: string,
    paramsMap: Array<[string, string]>,
  }
}

export class TransformXsltResult extends jspb.Message {
  getOutput(): string;
  setOutput(value: string): void;

  getOutputMethod(): string;
  setOutputMethod(value: string): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): TransformXsltResult.AsObject;
  static toObject(includeInstance: boolean, msg: TransformXsltResult): TransformXsltResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: TransformXsltResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): TransformXsltResult;
  static deserializeBinaryFromReader(message: TransformXsltResult, reader: jspb.BinaryReader): TransformXsltResult;
}

export namespace TransformXsltResult {
  export type AsObject = {
    output: string,
    outputMethod: string,
    error?: Error.AsObject,
  }
}

export class ValidateXsdRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXsd(): string;
  setXsd(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ValidateXsdRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ValidateXsdRequest): ValidateXsdRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ValidateXsdRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ValidateXsdRequest;
  static deserializeBinaryFromReader(message: ValidateXsdRequest, reader: jspb.BinaryReader): ValidateXsdRequest;
}

export namespace ValidateXsdRequest {
  export type AsObject = {
    xml: string,
    xsd: string,
  }
}

export class ValidationViolation extends jspb.Message {
  getMessage(): string;
  setMessage(value: string): void;

  getLine(): number;
  setLine(value: number): void;

  getColumn(): number;
  setColumn(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ValidationViolation.AsObject;
  static toObject(includeInstance: boolean, msg: ValidationViolation): ValidationViolation.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ValidationViolation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ValidationViolation;
  static deserializeBinaryFromReader(message: ValidationViolation, reader: jspb.BinaryReader): ValidationViolation;
}

export namespace ValidationViolation {
  export type AsObject = {
    message: string,
    line: number,
    column: number,
  }
}

export class ValidateXsdResult extends jspb.Message {
  getValid(): boolean;
  setValid(value: boolean): void;

  clearViolationsList(): void;
  getViolationsList(): Array<ValidationViolation>;
  setViolationsList(value: Array<ValidationViolation>): void;
  addViolations(value?: ValidationViolation, index?: number): ValidationViolation;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ValidateXsdResult.AsObject;
  static toObject(includeInstance: boolean, msg: ValidateXsdResult): ValidateXsdResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ValidateXsdResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ValidateXsdResult;
  static deserializeBinaryFromReader(message: ValidateXsdResult, reader: jspb.BinaryReader): ValidateXsdResult;
}

export namespace ValidateXsdResult {
  export type AsObject = {
    valid: boolean,
    violationsList: Array<ValidationViolation.AsObject>,
    error?: Error.AsObject,
  }
}

export class ExtractNamespacesRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExtractNamespacesRequest.AsObject;
  static toObject(includeInstance: boolean, msg: ExtractNamespacesRequest): ExtractNamespacesRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExtractNamespacesRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExtractNamespacesRequest;
  static deserializeBinaryFromReader(message: ExtractNamespacesRequest, reader: jspb.BinaryReader): ExtractNamespacesRequest;
}

export namespace ExtractNamespacesRequest {
  export type AsObject = {
    xml: string,
  }
}

export class NamespaceDeclaration extends jspb.Message {
  getPrefix(): string;
  setPrefix(value: string): void;

  getUri(): string;
  setUri(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): NamespaceDeclaration.AsObject;
  static toObject(includeInstance: boolean, msg: NamespaceDeclaration): NamespaceDeclaration.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: NamespaceDeclaration, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): NamespaceDeclaration;
  static deserializeBinaryFromReader(message: NamespaceDeclaration, reader: jspb.BinaryReader): NamespaceDeclaration;
}

export namespace NamespaceDeclaration {
  export type AsObject = {
    prefix: string,
    uri: string,
  }
}

export class ExtractNamespacesResult extends jspb.Message {
  clearNamespacesList(): void;
  getNamespacesList(): Array<NamespaceDeclaration>;
  setNamespacesList(value: Array<NamespaceDeclaration>): void;
  addNamespaces(value?: NamespaceDeclaration, index?: number): NamespaceDeclaration;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ExtractNamespacesResult.AsObject;
  static toObject(includeInstance: boolean, msg: ExtractNamespacesResult): ExtractNamespacesResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ExtractNamespacesResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ExtractNamespacesResult;
  static deserializeBinaryFromReader(message: ExtractNamespacesResult, reader: jspb.BinaryReader): ExtractNamespacesResult;
}

export namespace ExtractNamespacesResult {
  export type AsObject = {
    namespacesList: Array<NamespaceDeclaration.AsObject>,
    error?: Error.AsObject,
  }
}

export class SelectFirstNodeRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SelectFirstNodeRequest.AsObject;
  static toObject(includeInstance: boolean, msg: SelectFirstNodeRequest): SelectFirstNodeRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SelectFirstNodeRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SelectFirstNodeRequest;
  static deserializeBinaryFromReader(message: SelectFirstNodeRequest, reader: jspb.BinaryReader): SelectFirstNodeRequest;
}

export namespace SelectFirstNodeRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class SelectFirstNodeResult extends jspb.Message {
  getFound(): boolean;
  setFound(value: boolean): void;

  getNode(): string;
  setNode(value: string): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SelectFirstNodeResult.AsObject;
  static toObject(includeInstance: boolean, msg: SelectFirstNodeResult): SelectFirstNodeResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SelectFirstNodeResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SelectFirstNodeResult;
  static deserializeBinaryFromReader(message: SelectFirstNodeResult, reader: jspb.BinaryReader): SelectFirstNodeResult;
}

export namespace SelectFirstNodeResult {
  export type AsObject = {
    found: boolean,
    node: string,
    error?: Error.AsObject,
  }
}

export class XPathExistsRequest extends jspb.Message {
  getXml(): string;
  setXml(value: string): void;

  getXpath(): string;
  setXpath(value: string): void;

  getNamespacesMap(): jspb.Map<string, string>;
  clearNamespacesMap(): void;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): XPathExistsRequest.AsObject;
  static toObject(includeInstance: boolean, msg: XPathExistsRequest): XPathExistsRequest.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: XPathExistsRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): XPathExistsRequest;
  static deserializeBinaryFromReader(message: XPathExistsRequest, reader: jspb.BinaryReader): XPathExistsRequest;
}

export namespace XPathExistsRequest {
  export type AsObject = {
    xml: string,
    xpath: string,
    namespacesMap: Array<[string, string]>,
  }
}

export class XPathExistsResult extends jspb.Message {
  getExists(): boolean;
  setExists(value: boolean): void;

  hasError(): boolean;
  clearError(): void;
  getError(): Error | undefined;
  setError(value?: Error): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): XPathExistsResult.AsObject;
  static toObject(includeInstance: boolean, msg: XPathExistsResult): XPathExistsResult.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: XPathExistsResult, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): XPathExistsResult;
  static deserializeBinaryFromReader(message: XPathExistsResult, reader: jspb.BinaryReader): XPathExistsResult;
}

export namespace XPathExistsResult {
  export type AsObject = {
    exists: boolean,
    error?: Error.AsObject,
  }
}

