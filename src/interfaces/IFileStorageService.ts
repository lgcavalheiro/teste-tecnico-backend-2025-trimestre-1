import { Readable } from 'stream';

export interface IFileStorageService {
  /**
   * Saves a file with the given filename and content
   * @param filename The name to save the file as
   * @param content The file content as a Buffer
   * @returns Promise that resolves when the file is saved
   */
  saveFile(filename: string, content: Buffer): Promise<void>;

  /**
   * Checks if a file exists
   * @param filename The name of the file to check
   * @returns Promise that resolves to true if the file exists, false otherwise
   */
  fileExists(filename: string): Promise<boolean>;

  /**
   * Gets the size of a file in bytes
   * @param filename The name of the file
   * @returns Promise that resolves to the file size in bytes
   */
  getFileSize(filename: string): Promise<number>;

  /**
   * Creates a read stream for a file
   * @param filename The name of the file to read
   * @param start Optional start byte position
   * @param end Optional end byte position
   * @returns A readable stream of the file content
   */
  createReadStream(
    filename: string, 
    start?: number, 
    end?: number
  ): Readable;

  /**
   * Deletes a file
   * @param filename The name of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  deleteFile(filename: string): Promise<void>;
}
