import comtypes.client
import os

word_path = os.path.abspath(r"C:\Users\neha0\OneDrive\Desktop\MCA_Major_Project_Documentation\IMS\IICET_Talent_Management_Project_Documentation.docx")
pdf_path = os.path.abspath(r"C:\Users\neha0\OneDrive\Desktop\MCA_Major_Project_Documentation\IMS\IICET_Talent_Management_Project_Documentation.pdf")

word = comtypes.client.CreateObject('Word.Application')
word.Visible = False

try:
    doc = word.Documents.Open(word_path)
    doc.SaveAs(pdf_path, FileFormat=17) # 17 = wdFormatPDF
    doc.Close()
    print("SUCCESS: PDF created at", pdf_path)
finally:
    word.Quit()
