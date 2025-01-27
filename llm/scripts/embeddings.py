import sys
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.vectorstores import FAISS
from langchain.document_loaders import PyPDFLoader, DirectoryLoader, UnstructuredExcelLoader, TextLoader, UnstructuredPowerPointLoader, UnstructuredMarkdownLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os

#import faiss



def embeddings(chosen_directory):

    current_directory = os.path.dirname(os.path.realpath(__file__))
    model_directory = os.path.join(current_directory, '..', 'baai')

    print("Model Directory:", os.path.abspath(model_directory))

    ### LOAD EMBEDDING SETTINGS
    embeddings=HuggingFaceEmbeddings(model_name=model_directory, model_kwargs={'device':'mps'}) # SET TO 'cpu' for PC

    text_splitter=RecursiveCharacterTextSplitter(
                                                chunk_size=8000,
                                                chunk_overlap=4000)
    

    victor = FAISS.from_texts(["foo"], embeddings)

    ###LOCATE DIRECTORY
    # Specify the desktop path
    desktop_path = os.path.join(os.path.expanduser("~"), "Documents")

    # Specify the folder name
    folder_name = "Dot-Data"

    # Combine the desktop path and folder name
    folder_path = os.path.join(desktop_path, folder_name)

    # Create the folder if it doesn't exist
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)


    directory = str(chosen_directory)

    ### PDF
    try:
        #**Step 1: Load the PDF File from Data Path****
        loader1=DirectoryLoader(directory,
                            glob="*.pdf",
                            loader_cls=PyPDFLoader,
                            show_progress=True,
                            use_multithreading=True,
                            recursive=True)
        
        documents_pdf = loader1.load()
        text_chunks_pdf=text_splitter.split_documents(documents_pdf)

        print(len(text_chunks_pdf))

        #**Step 4: Convert the Text Chunks into Embeddings and Create a FAISS Vector Store***
        vector_store_pdf=FAISS.from_documents(text_chunks_pdf, embeddings)
        #vector_store_pdf.save_local(os.path.join(folder_path, "Dot-data-pdf"))
        victor.merge_from(vector_store_pdf)

    except Exception as error:
        print("NO PDFs FOUND" + str(error))



    ### WORD
    try:    
        loader2=DirectoryLoader(directory,
                        glob="*.docx",
                        loader_cls=Docx2txtLoader,
                        show_progress=True,
                        use_multithreading=True,
                        recursive=True)
        
        documents_word = loader2.load()
        text_chunks_word=text_splitter.split_documents(documents_word)

        print(len(text_chunks_word))

        #**Step 4: Convert the Text Chunks into Embeddings and Create a FAISS Vector Store***
        vector_store_word=FAISS.from_documents(text_chunks_word, embeddings)
        #vector_store_word.save_local(os.path.join(folder_path, "Dot-data-word"))
        victor.merge_from(vector_store_word)

    except Exception as error:
        print("NO WORD DOCUMENTS FOUND" + str(error))



    ### POWER POINT
    try:
        loader3=DirectoryLoader(directory,
                        glob="*.pptx",
                        loader_cls=UnstructuredPowerPointLoader,
                        show_progress=True,
                        use_multithreading=True,
                        recursive=True)
        
        documents_ppt = loader3.load()
        text_chunks_ppt=text_splitter.split_documents(documents_ppt)

        print(len(text_chunks_ppt))

        #**Step 4: Convert the Text Chunks into Embeddings and Create a FAISS Vector Store***
        vector_store_ppt=FAISS.from_documents(text_chunks_ppt, embeddings)
        #vector_store_ppt.save_local(os.path.join(folder_path, "Dot-data-ppt"))
        victor.merge_from(vector_store_ppt)

    except Exception as error:
        print("NO POWER POINTS FOUND" + str(error))

    ### EXCEL
    try:
        loader4=DirectoryLoader(directory,
                        glob="*.xlsx",
                        loader_cls=UnstructuredExcelLoader,
                        show_progress=True,
                        use_multithreading=True,
                        recursive=True)
        
        documents_xlsx = loader4.load()
        text_chunks_xlsx=text_splitter.split_documents(documents_xlsx)

        print(len(text_chunks_ppt))

        #**Step 4: Convert the Text Chunks into Embeddings and Create a FAISS Vector Store***
        vector_store_xlsx=FAISS.from_documents(text_chunks_xlsx, embeddings)
        #vector_store_ppt.save_local(os.path.join(folder_path, "Dot-data-ppt"))
        victor.merge_from(vector_store_xlsx)

    except Exception as error:
        print("NO EXCEL FOUND" + str(error))

    # MARKDOWN
    try:
        loader5=DirectoryLoader(directory,
                        glob="*.md",
                        loader_cls=UnstructuredMarkdownLoader,
                        show_progress=True,
                        use_multithreading=True,
                        recursive=True)
        
        documents_md = loader5.load()
        text_chunks_md=text_splitter.split_documents(documents_md)

        print(len(text_chunks_md))

        #**Step 4: Convert the Text Chunks into Embeddings and Create a FAISS Vector Store***
        vector_store_md=FAISS.from_documents(text_chunks_md, embeddings)
        #vector_store_ppt.save_local(os.path.join(folder_path, "Dot-data-ppt"))
        victor.merge_from(vector_store_md)

    except Exception as error:
        print("NO MARKDOWN FOUND" + str(error))
    
    
    victor.save_local(os.path.join(folder_path, "Dot-data"))






if __name__ == "__main__":
    # Check if the correct number of command-line arguments is provided

    print("Usage: python your_script.py <directory_path>")

    # Get the directory path from the command-line argument
    directory_path = sys.argv[1]

    # Now, you can use the directory_path variable in your script
    print(f"Processing directory: {directory_path}")
    embeddings(directory_path)
    print("LESGOOOOOO")

